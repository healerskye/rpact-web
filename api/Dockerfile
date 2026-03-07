FROM --platform=linux/amd64 rocker/r-ver:4.4

# System dependencies
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages('jsonlite', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('rpact', repos='https://cloud.r-project.org')"

WORKDIR /api
COPY plumber.R .

EXPOSE 8000

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8000')); plumber::plumb('plumber.R')$run(host='0.0.0.0', port=port)"]
