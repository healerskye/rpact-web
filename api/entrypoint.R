#!/usr/bin/env Rscript
# Two-phase startup to beat Render's port-binding timeout:
# 1. Bind port immediately with httpuv (responds to health check)
# 2. Load plumber+rpact while periodically calling httpuv::service()
# 3. Once plumber is ready, stop httpuv and start plumber

library(httpuv)

port <- as.integer(Sys.getenv("PORT", "8000"))
cat("Binding port", port, "...\n")

initialized <- FALSE

app <- list(
  call = function(req) {
    if (req$PATH_INFO == "/health") {
      msg <- if (initialized) '{"status":"ok"}' else '{"status":"starting"}'
      list(status = 200L,
           headers = list("Content-Type" = "application/json"),
           body = msg)
    } else {
      list(status = 503L,
           headers = list("Content-Type" = "application/json"),
           body = '{"status":"starting","message":"Server initializing, try again shortly"}')
    }
  }
)

srv <- startServer("0.0.0.0", port, app)
cat("Port", port, "bound. Loading libraries...\n")

# Load in chunks, servicing httpuv between each step
httpuv::service(100)
library(jsonlite)
httpuv::service(100)
library(plumber)
httpuv::service(100)

cat("Libraries loaded. Parsing plumber routes...\n")
pr <- plumber::plumb("plumber.R")
httpuv::service(100)

initialized <- TRUE
cat("Initialization complete. Switching to plumber...\n")

stopServer(srv)
pr$run(host = "0.0.0.0", port = port)
