#!/bin/bash
cd /home/onemail1812/zroky || exit 1
sudo git reset --hard
sudo git checkout main
sudo git pull origin main
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d --remove-orphans
echo "Deployment successful."
