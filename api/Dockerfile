FROM rocker/r-ver:4.4

# System dependencies
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages one at a time, fail if not installed
RUN R -e "install.packages('jsonlite', repos='https://cloud.r-project.org'); if (!requireNamespace('jsonlite', quietly=TRUE)) stop('jsonlite failed')"
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org'); if (!requireNamespace('plumber', quietly=TRUE)) stop('plumber failed')"
RUN R -e "install.packages('rpact', repos='https://cloud.r-project.org'); if (!requireNamespace('rpact', quietly=TRUE)) stop('rpact failed')"

# Verify all packages load
RUN R -e "library(jsonlite); library(plumber); library(rpact); cat('All packages OK\n')"

WORKDIR /api
COPY plumber.R .

EXPOSE 8080

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8080')); plumber::plumb('plumber.R')$run(host='0.0.0.0', port=port)"]
