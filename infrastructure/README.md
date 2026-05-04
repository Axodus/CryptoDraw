# Infraestrutura - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém configurações de infraestrutura, Docker, CI/CD e deployment para o projeto CryptoDraw. Implementar uma infraestrutura robusta e escalável para produção.

## Estrutura da Infraestrutura

```
infrastructure/
├── docker/                 # Containerização
├── k8s/                   # Kubernetes manifests
├── terraform/             # Infrastructure as Code
├── ci-cd/                 # Pipelines CI/CD
├── monitoring/            # Monitoring e observability
├── nginx/                 # Load balancer configs
└── scripts/               # Scripts de automação
```

## 1. Docker Configuration

### 1.1 Backend Dockerfile
**Arquivo**: `docker/backend/Dockerfile`

```dockerfile
# Multi-stage build para otimização
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Install curl for health check
RUN apk add --no-cache curl

# Switch to non-root user
USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### 1.2 Frontend Dockerfile
**Arquivo**: `docker/frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 Database Dockerfile
**Arquivo**: `docker/database/Dockerfile`

```dockerfile
FROM postgres:15-alpine

# Install extensions
RUN apk add --no-cache postgresql-contrib

# Copy initialization scripts
COPY infrastructure/database/init/ /docker-entrypoint-initdb.d/

# Copy custom postgresql.conf
COPY infrastructure/database/postgresql.conf /etc/postgresql/postgresql.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

EXPOSE 5432
```

### 1.4 Docker Compose
**Arquivo**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Database
  postgres:
    build: ./infrastructure/docker/database
    container_name: cryptodraw-db
    environment:
      POSTGRES_DB: cryptodraw
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/database/backups:/backups
    ports:
      - "5432:5432"
    networks:
      - cryptodraw-network
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    container_name: cryptodraw-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - cryptodraw-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "auth", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Backend API
  backend:
    build: 
      context: .
      dockerfile: ./infrastructure/docker/backend/Dockerfile
    container_name: cryptodraw-backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: cryptodraw
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ETHEREUM_RPC_URL: ${ETHEREUM_RPC_URL}
      CONSOLIDATOR_PRIVATE_KEY: ${CONSOLIDATOR_PRIVATE_KEY}
    volumes:
      - ./logs:/app/logs
    ports:
      - "3001:3001"
    networks:
      - cryptodraw-network
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: ./infrastructure/docker/frontend/Dockerfile
    container_name: cryptodraw-frontend
    ports:
      - "80:80"
      - "443:443"
    networks:
      - cryptodraw-network
    depends_on:
      - backend
    restart: unless-stopped

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: cryptodraw-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - cryptodraw-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: cryptodraw-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3000:3000"
    networks:
      - cryptodraw-network
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  cryptodraw-network:
    driver: bridge
```

### 1.5 Production Docker Compose
**Arquivo**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  postgres:
    extends:
      file: docker-compose.yml
      service: postgres
    volumes:
      - /data/postgres:/var/lib/postgresql/data
      - /backups/postgres:/backups
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    extends:
      file: docker-compose.yml
      service: redis
    volumes:
      - /data/redis:/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    extends:
      file: docker-compose.yml
      service: backend
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
    volumes:
      - /logs/cryptodraw:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  frontend:
    extends:
      file: docker-compose.yml
      service: frontend
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Load Balancer
  nginx:
    image: nginx:alpine
    container_name: cryptodraw-nginx
    volumes:
      - ./infrastructure/nginx/nginx-prod.conf:/etc/nginx/nginx.conf
      - ./infrastructure/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    networks:
      - cryptodraw-network
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

## 2. Kubernetes Configuration

### 2.1 Namespace
**Arquivo**: `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cryptodraw
  labels:
    name: cryptodraw
```

### 2.2 ConfigMap
**Arquivo**: `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cryptodraw-config
  namespace: cryptodraw
data:
  NODE_ENV: "production"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "cryptodraw"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  API_URL: "https://api.cryptodraw.com"
  WS_URL: "wss://api.cryptodraw.com/ws"
```

### 2.3 Secrets
**Arquivo**: `k8s/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cryptodraw-secrets
  namespace: cryptodraw
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-secret>
  CONSOLIDATOR_PRIVATE_KEY: <base64-encoded-key>
  ETHEREUM_RPC_URL: <base64-encoded-url>
```

### 2.4 Database Deployment
**Arquivo**: `k8s/postgres-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: cryptodraw
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: cryptodraw-config
              key: DB_NAME
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: cryptodraw-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
              - pg_isready
              - -U
              - postgres
              - -d
              - cryptodraw
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: cryptodraw
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 2.5 Backend Deployment
**Arquivo**: `k8s/backend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: cryptodraw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: cryptodraw/backend:latest
        envFrom:
        - configMapRef:
            name: cryptodraw-config
        - secretRef:
            name: cryptodraw-secrets
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: cryptodraw
spec:
  selector:
    app: backend
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### 2.6 Frontend Deployment
**Arquivo**: `k8s/frontend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: cryptodraw
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: cryptodraw/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: cryptodraw
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### 2.7 Ingress
**Arquivo**: `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cryptodraw-ingress
  namespace: cryptodraw
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - cryptodraw.com
    - api.cryptodraw.com
    secretName: cryptodraw-tls
  rules:
  - host: cryptodraw.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.cryptodraw.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3001
```

## 3. CI/CD Pipelines

### 3.1 GitHub Actions
**Arquivo**: `ci-cd/github-actions.yml`

```yaml
name: CryptoDraw CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: cryptodraw

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: cryptodraw_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          backend/package-lock.json
          frontend/package-lock.json

    # Install Hardhat and test contracts
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
        cd ../frontend && npm ci

    - name: Test Smart Contracts
      run: |
        npm run test:contracts
        
    - name: Test Backend
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: cryptodraw_test
        DB_USER: postgres
        DB_PASSWORD: test
        REDIS_HOST: localhost
        REDIS_PORT: 6379
      run: |
        cd backend
        npm run test:coverage

    - name: Test Frontend
      run: |
        cd frontend
        npm run test:coverage

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: |
        npm audit --audit-level high
        cd backend && npm audit --audit-level high
        cd ../frontend && npm audit --audit-level high

    - name: Run Slither (Smart Contracts)
      uses: crytic/slither-action@v0.3.0
      id: slither
      with:
        sarif: results.sarif

    - name: Upload SARIF file
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: ${{ steps.slither.outputs.sarif }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        service: [backend, frontend]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ github.repository }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./infrastructure/docker/${{ matrix.service }}/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    environment: staging
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment"
        # Add staging deployment logic here
        # kubectl apply -f k8s/ --namespace=cryptodraw-staging

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploying to production environment"
        # Add production deployment logic here
        # kubectl apply -f k8s/ --namespace=cryptodraw-prod
```

### 3.2 GitLab CI/CD
**Arquivo**: `ci-cd/gitlab-ci.yml`

```yaml
stages:
  - test
  - security
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

# Test Stage
test:contracts:
  stage: test
  image: node:18
  services:
    - name: trufflesuite/ganache-cli:latest
      alias: ganache
  script:
    - npm ci
    - npm run test:contracts
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:backend:
  stage: test
  image: node:18
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: cryptodraw_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: test
  script:
    - cd backend
    - npm ci
    - npm run test:coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage/cobertura-coverage.xml

test:frontend:
  stage: test
  image: node:18
  script:
    - cd frontend
    - npm ci
    - npm run test:coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: frontend/coverage/cobertura-coverage.xml

# Security Stage
security:audit:
  stage: security
  image: node:18
  script:
    - npm audit --audit-level high
    - cd backend && npm audit --audit-level high
    - cd ../frontend && npm audit --audit-level high
  allow_failure: true

security:contracts:
  stage: security
  image: mythril/myth:latest
  script:
    - myth analyze contracts/*.sol
  allow_failure: true

# Build Stage
.build_template: &build_template
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -f infrastructure/docker/$SERVICE/Dockerfile -t $CI_REGISTRY_IMAGE/$SERVICE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE/$SERVICE:$CI_COMMIT_SHA
    - |
      if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        docker tag $CI_REGISTRY_IMAGE/$SERVICE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/$SERVICE:latest
        docker push $CI_REGISTRY_IMAGE/$SERVICE:latest
      fi

build:backend:
  <<: *build_template
  variables:
    SERVICE: backend

build:frontend:
  <<: *build_template
  variables:
    SERVICE: frontend

# Deploy Stage
deploy:staging:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.cryptodraw.com
  script:
    - kubectl config set-cluster staging --server=$KUBE_URL --certificate-authority=$KUBE_CA_PEM_FILE
    - kubectl config set-credentials staging-user --token=$KUBE_TOKEN
    - kubectl config set-context staging --cluster=staging --user=staging-user
    - kubectl config use-context staging
    - kubectl apply -f k8s/ -n cryptodraw-staging
    - kubectl set image deployment/backend backend=$CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -n cryptodraw-staging
    - kubectl set image deployment/frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -n cryptodraw-staging
  only:
    - develop

deploy:production:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://cryptodraw.com
  script:
    - kubectl config set-cluster production --server=$KUBE_URL --certificate-authority=$KUBE_CA_PEM_FILE
    - kubectl config set-credentials prod-user --token=$KUBE_TOKEN
    - kubectl config set-context production --cluster=production --user=prod-user
    - kubectl config use-context production
    - kubectl apply -f k8s/ -n cryptodraw-prod
    - kubectl set image deployment/backend backend=$CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -n cryptodraw-prod
    - kubectl set image deployment/frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -n cryptodraw-prod
  when: manual
  only:
    - main
```

## 4. Terraform Infrastructure

### 4.1 Main Configuration
**Arquivo**: `terraform/main.tf`

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "s3" {
    bucket = "cryptodraw-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = var.cluster_name
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3
      
      instance_types = ["t3.medium"]
      
      k8s_labels = {
        Environment = var.environment
        Application = "cryptodraw"
      }
    }
  }
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  
  tags = {
    Environment = var.environment
    Application = "cryptodraw"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.cluster_name}-postgres"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "cryptodraw"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.cluster_name}-final-snapshot"
  
  tags = {
    Environment = var.environment
    Application = "cryptodraw"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.cluster_name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  tags = {
    Environment = var.environment
    Application = "cryptodraw"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.cluster_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = true
  
  tags = {
    Environment = var.environment
    Application = "cryptodraw"
  }
}
```

### 4.2 Variables
**Arquivo**: `terraform/variables.tf`

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "cryptodraw-prod"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "cryptodraw.com"
}
```

## 5. Monitoring e Observability

### 5.1 Prometheus Configuration
**Arquivo**: `monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alertmanager:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Backend API
  - job_name: 'cryptodraw-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: /metrics
    scrape_interval: 30s

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  # Kubernetes components (if using K8s)
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - default
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
```

### 5.2 Alert Rules
**Arquivo**: `monitoring/alert_rules.yml`

```yaml
groups:
  - name: cryptodraw.rules
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      # Database connection issues
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding"

      # Redis connection issues
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis cache is not responding"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      # Disk space running low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space running low"
          description: "Available disk space is {{ $value | humanizePercentage }}"
```

### 5.3 Grafana Dashboard
**Arquivo**: `monitoring/grafana/dashboards/cryptodraw-overview.json`

```json
{
  "dashboard": {
    "id": null,
    "title": "CryptoDraw Overview",
    "tags": ["cryptodraw"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {"mode": "palette-classic"},
            "unit": "reqps"
          }
        }
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "id": 4,
        "title": "Database Connections",
        "type": "timeseries",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Connections"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

## 6. Scripts de Automação

### 6.1 Backup Script
**Arquivo**: `scripts/backup.sh`

```bash
#!/bin/bash

set -e

# Configuration
BACKUP_DIR="/backups"
DB_NAME="cryptodraw"
DB_USER="postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Database backup
echo "Starting database backup..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Redis backup
echo "Starting Redis backup..."
redis-cli --rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# File system backup (if using local storage)
echo "Starting file system backup..."
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /app/uploads /app/logs

# Upload to S3 (if configured)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "Uploading backups to S3..."
    aws s3 sync $BACKUP_DIR s3://$AWS_S3_BUCKET/backups/
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully!"
```

### 6.2 Deploy Script
**Arquivo**: `scripts/deploy.sh`

```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}
NAMESPACE="cryptodraw-$ENVIRONMENT"

echo "Deploying CryptoDraw to $ENVIRONMENT environment..."

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
kubectl apply -f k8s/secrets.yaml -n $NAMESPACE
kubectl apply -f k8s/ -n $NAMESPACE

# Update image tags
echo "Updating image tags to $IMAGE_TAG..."
kubectl set image deployment/backend backend=cryptodraw/backend:$IMAGE_TAG -n $NAMESPACE
kubectl set image deployment/frontend frontend=cryptodraw/frontend:$IMAGE_TAG -n $NAMESPACE

# Wait for rollout to complete
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=300s

# Verify deployment
echo "Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

# Run health checks
echo "Running health checks..."
sleep 30
BACKEND_POD=$(kubectl get pods -l app=backend -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
kubectl exec $BACKEND_POD -n $NAMESPACE -- curl -f http://localhost:3001/health

echo "Deployment completed successfully!"
```

### 6.3 Health Check Script
**Arquivo**: `scripts/healthcheck.sh`

```bash
#!/bin/bash

# Configuration
API_URL=${API_URL:-"http://localhost:3001"}
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url")
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}OK${NC} (HTTP $status_code)"
        return 0
    else
        echo -e "${RED}FAIL${NC} (HTTP $status_code)"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -n "Checking database... "
    
    if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} >/dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    echo -n "Checking Redis... "
    
    if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping >/dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

# Main health check
echo "CryptoDraw Health Check"
echo "======================"

failed_checks=0

# API Health Check
check_service "API Health" "$API_URL/health" || ((failed_checks++))

# API Ready Check
check_service "API Ready" "$API_URL/ready" || ((failed_checks++))

# Database Check
check_database || ((failed_checks++))

# Redis Check
check_redis || ((failed_checks++))

# Frontend Check (if URL provided)
if [ ! -z "$FRONTEND_URL" ]; then
    check_service "Frontend" "$FRONTEND_URL" || ((failed_checks++))
fi

echo "======================"

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$failed_checks check(s) failed!${NC}"
    exit 1
fi
```

## Checklist de Implementação da Infraestrutura

### Docker & Containerização
- [ ] Dockerfile para backend otimizado
- [ ] Dockerfile para frontend com Nginx
- [ ] Docker Compose para desenvolvimento
- [ ] Docker Compose para produção
- [ ] Multi-stage builds para otimização
- [ ] Health checks em containers

### Kubernetes
- [ ] Namespace e configurações
- [ ] Deployments para todos os serviços
- [ ] Services e Ingress
- [ ] ConfigMaps e Secrets
- [ ] Persistent Volumes
- [ ] Resource limits e requests
- [ ] Liveness e readiness probes

### CI/CD
- [ ] GitHub Actions pipeline
- [ ] GitLab CI/CD pipeline
- [ ] Automated testing
- [ ] Security scanning
- [ ] Image building e push
- [ ] Automated deployment

### Infraestrutura como Código
- [ ] Terraform configuration
- [ ] AWS EKS cluster
- [ ] RDS PostgreSQL
- [ ] ElastiCache Redis
- [ ] VPC e networking
- [ ] Security groups
- [ ] Load balancer

### Monitoramento
- [ ] Prometheus configuration
- [ ] Grafana dashboards
- [ ] Alert rules
- [ ] Log aggregation
- [ ] Performance metrics
- [ ] Business metrics

### Automação
- [ ] Backup scripts
- [ ] Deploy scripts
- [ ] Health check scripts
- [ ] Monitoring scripts
- [ ] Maintenance scripts
- [ ] Disaster recovery procedures