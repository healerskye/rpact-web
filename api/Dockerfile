FROM rocker/r-ver:4.4

# System dependencies for plumber and rpact
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Install plumber from CRAN with verbose output
RUN R -e " \
  options(repos=c(CRAN='https://cloud.r-project.org')); \
  install.packages('plumber', verbose=TRUE, INSTALL_opts='--no-test-load'); \
  cat('plumber installed:', requireNamespace('plumber', quietly=TRUE), '\n')"

RUN R -e "if (!requireNamespace('plumber', quietly=TRUE)) stop('plumber not installed') else cat('plumber OK\n')"

RUN R -e "install.packages(c('rpact','rappdirs'), repos='https://cloud.r-project.org'); if (!requireNamespace('rpact', quietly=TRUE)) stop('rpact failed')"

# Verify
RUN R -e "library(plumber); library(rpact); cat('All OK\n')"

WORKDIR /api
COPY plumber.R .

EXPOSE 8080

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8080')); plumber::plumb('plumber.R')$run(host='0.0.0.0', port=port)"]
