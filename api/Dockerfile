FROM rocker/r-ver:4.4

# System dependencies
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages one at a time to isolate failures
RUN R -e "install.packages('jsonlite', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('rpact', repos='https://cloud.r-project.org')"

WORKDIR /api
COPY plumber.R .
COPY entrypoint.R .

EXPOSE 8000

# Two-phase startup: bind port immediately (for health check), then load plumber
CMD ["Rscript", "entrypoint.R"]
