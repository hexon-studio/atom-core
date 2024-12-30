# Usa l'immagine base di Ubuntu 22.04
FROM ubuntu:22.04

# Aggiorna il sistema e installa le dipendenze necessarie
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Aggiungi il repository di NodeSource per Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

# Installa Node.js 22
RUN apt-get install -y nodejs
# Install wget
RUN apt-get install -y wget
# Install git
RUN apt-get install -y git

# Verifica l'installazione di Node.js e npm
RUN node -v
RUN npm -v

# Imposta la directory di lavoro
WORKDIR /app

# Copia il contenuto del progetto nella directory di lavoro
COPY . .

#download and install gitleaks
RUN wget https://github.com/gitleaks/gitleaks/releases/download/v8.16.0/gitleaks_8.16.0_linux_x64.tar.gz
RUN tar -xvf gitleaks_8.16.0_linux_x64.tar.gz
RUN mv gitleaks /usr/local/bin/

#install husky
RUN npm install husky
RUN npx husky install
#install renovate
RUN npm install renovate --save-dev
