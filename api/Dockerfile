FROM rocker/r-ver:4.4

# System dependencies
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages - error on failure
RUN R -e "options(warn=2); install.packages('jsonlite', repos='https://cloud.r-project.org', dependencies=TRUE)"
RUN R -e "options(warn=2); install.packages('plumber', repos='https://cloud.r-project.org', dependencies=TRUE)"
RUN R -e "options(warn=2); install.packages('rpact', repos='https://cloud.r-project.org', dependencies=TRUE)"

# Verify packages installed correctly
RUN R -e "library(jsonlite); library(plumber); library(rpact); cat('All packages OK\n')"

WORKDIR /api
COPY plumber.R .

EXPOSE 8080

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8080')); plumber::plumb('plumber.R')$run(host='0.0.0.0', port=port)"]
