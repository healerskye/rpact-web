FROM rocker/r-ver:4.4

# System dependencies
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install R packages one at a time to isolate failures
RUN R -e "install.packages('jsonlite', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org')"
RUN R -e "install.packages('rpact', repos='https://cloud.r-project.org')"

WORKDIR /api
COPY plumber.R .
COPY start.py .

EXPOSE 8000

# start.py: binds port immediately (health check passes), then hands off to R
CMD ["python3", "start.py"]
