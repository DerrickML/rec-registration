#!/bin/bash
LOGFILE="/srv/rec-registration/deploy.log"
BRANCH="main"
APP="rec-portal"

cd /srv/rec-registration || { echo "❌ Failed to cd"; exit 1; }

# Check if log file exists, create if not
if [ ! -f "$LOGFILE" ]; then
    touch "$LOGFILE" || { echo "❌ Could not create log file"; exit 1; }
fi

{
    echo "🔄 Pulling latest changes..."
    git pull origin $BRANCH || { echo "❌ Git pull failed"; exit 1; }

    echo "📦 Installing dependencies..."
    npm ci || {
        echo "⚠️ npm ci failed, retrying with legacy peer deps...";
        npm install --legacy-peer-deps || { echo "❌ npm install failed"; exit 1; }
    }

    echo "🏗️ Building production files..."
    npm run build || { echo "❌ Build failed"; exit 1; }

    echo "🚀 Restarting $APP..."
    pm2 restart $APP || { echo "❌ PM2 restart failed"; exit 1; }

    echo "✅ Deployment complete!"
    echo "🌐 Application is live at https://rec.nrep.ug"
} | tee -a "$LOGFILE"