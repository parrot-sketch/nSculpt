#!/bin/bash
TAG="202601151258"
ACCOUNT="911292872395"
REGION="us-east-1"
REPO_PREFIX="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_PREFIX

echo "Tagging backend..."
docker tag bkg2025/ehr-backend:latest $REPO_PREFIX/parrot-backend:$TAG
echo "Tagging frontend..."
docker tag bkg2025/ehr-frontend:latest $REPO_PREFIX/parrot-frontend:$TAG

echo "Pushing backend..."
docker push $REPO_PREFIX/parrot-backend:$TAG
echo "Pushing frontend..."
docker push $REPO_PREFIX/parrot-frontend:$TAG

echo "Verification..."
aws ecr describe-images --repository-name parrot-backend --image-ids imageTag=$TAG --region $REGION
aws ecr describe-images --repository-name parrot-frontend --image-ids imageTag=$TAG --region $REGION
