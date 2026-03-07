FROM rocker/r-ver:4.4

# System dependencies for R packages
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages(c('plumber','rpact','jsonlite'), repos='https://cloud.r-project.org', Ncpus=2)"

WORKDIR /api
COPY plumber.R .

EXPOSE 8000

CMD ["Rscript", "-e", "plumber::plumb('plumber.R')$run(host='0.0.0.0', port=8000)"]
