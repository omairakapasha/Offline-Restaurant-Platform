#!/bin/bash
echo "==================================================="
echo "  Self-Hosted Restaurant Ordering System Setup"
echo "==================================================="
echo ""

if [ ! -f .env ]; then
    echo "[INFO] First run detected. Creating your .env file automatically..."
    cp .env.example .env
    
    # Generate a random 32-character hex string for the session secret
    SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 64)
    echo "SESSION_SECRET=$SECRET" >> .env
    
    echo "[SUCCESS] .env file created with a secure session secret."
    echo ""
else
    echo "[INFO] .env file already exists."
fi

echo "[INFO] Starting the server and database using Docker..."
docker compose up -d

echo ""
echo "==================================================="
echo "  SUCCESS! The system is starting up."
echo ""
echo "  1. The menu is available at: http://localhost:5000"
echo "  2. Admin Panel is at:        http://localhost:5000/admin"
echo ""
echo "  Default Admin Username: admin"
echo "  Default Admin Password: admin123"
echo "==================================================="
