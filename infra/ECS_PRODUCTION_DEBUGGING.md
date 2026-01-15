# ECS Production Service Restart Debugging Guide

## 🔍 Issues Identified and Fixed

### 1. **Missing ECS Health Check Configuration** ✅ FIXED
**Problem:** The Terraform ECS task definition didn't include health check configuration, causing ECS to not properly monitor container health.

**Fix:** Added health check support to the ECS module:
- Added `health_check` variable to container definitions
- Health check now configured: `CMD-SHELL wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1`
- Interval: 30s, Timeout: 5s, Retries: 3, Start Period: 120s

### 2. **Missing Deployment Configuration** ✅ FIXED
**Problem:** No deployment configuration meant no grace period for health checks during startup.

**Fix:** Added deployment configuration:
- `health_check_grace_period_seconds: 180` (3 minutes for migrations/startup)
- `maximum_percent: 200`
- `minimum_healthy_percent: 100`

### 3. **Insufficient Resources** ✅ FIXED
**Problem:** Default CPU (256) and memory (512MB) were too low for production workloads.

**Fix:** Increased resources:
- CPU: 512 (from 256)
- Memory: 1024MB (from 512MB)

### 4. **Health Check Path** ✅ VERIFIED
**Status:** ALB health check uses `/api/health` which is correct (HealthController endpoint).

### 5. **Missing Essential Flag** ✅ FIXED
**Problem:** Container definition didn't explicitly set `essential: true`.

**Fix:** Added `essential: true` to container definition.

---

## 🚀 How to Apply Fixes

### Step 1: Review Changes
```bash
cd /home/bkg/parrot/infra/terraform/environments/dev
terraform plan
```

### Step 2: Apply Terraform Changes
```bash
terraform apply
```

This will:
- Update the ECS task definition with health checks
- Update the ECS service with deployment configuration
- Increase resource limits

### Step 3: Force New Deployment (if needed)
After applying Terraform, force a new deployment to pick up the changes:
```bash
aws ecs update-service \
  --cluster parrot-dev-backend \
  --service parrot-dev-backend \
  --force-new-deployment \
  --region us-east-1
```

---

## 🔧 Debugging Production Issues

### Quick Debug Script
Use the provided debugging script:
```bash
cd /home/bkg/parrot/infra/scripts
./debug-ecs-service.sh [cluster-name] [service-name] [aws-region]

# Example:
./debug-ecs-service.sh parrot-dev-backend parrot-dev-backend us-east-1
```

### Manual Debugging Steps

#### 1. Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster parrot-dev-backend \
  --services parrot-dev-backend \
  --region us-east-1 \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,Events:events[0:10]}'
```

#### 2. Check Recent Tasks
```bash
# Get running tasks
aws ecs list-tasks \
  --cluster parrot-dev-backend \
  --service-name parrot-dev-backend \
  --region us-east-1

# Get stopped tasks (to see why they stopped)
aws ecs list-tasks \
  --cluster parrot-dev-backend \
  --service-name parrot-dev-backend \
  --desired-status STOPPED \
  --region us-east-1 \
  --max-items 10

# Describe stopped tasks
aws ecs describe-tasks \
  --cluster parrot-dev-backend \
  --tasks <task-arn> \
  --region us-east-1 \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[*].{ExitCode:exitCode,Reason:reason}}'
```

#### 3. Check CloudWatch Logs
```bash
# Tail logs in real-time
aws logs tail /aws/ecs/parrot-dev-backend --follow --region us-east-1

# Get recent logs
aws logs get-log-events \
  --log-group-name /aws/ecs/parrot-dev-backend \
  --log-stream-name <stream-name> \
  --limit 100 \
  --region us-east-1

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/parrot-dev-backend \
  --filter-pattern "ERROR error Error exception Exception" \
  --region us-east-1
```

#### 4. Execute into Running Container
```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster parrot-dev-backend \
  --service-name parrot-dev-backend \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Execute into container
aws ecs execute-command \
  --cluster parrot-dev-backend \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "/bin/sh" \
  --region us-east-1
```

#### 5. Check Health Check Status
```bash
# Check if health endpoint is accessible
aws ecs execute-command \
  --cluster parrot-dev-backend \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "wget -O- http://localhost:3001/api/health" \
  --region us-east-1
```

---

## 🐛 Common Causes of Restarts

### 1. **Health Check Failures**
**Symptoms:**
- Tasks start but stop after health check grace period
- `stoppedReason: "Essential container in task exited"`

**Debug:**
```bash
# Check health check configuration
aws ecs describe-task-definition \
  --task-definition parrot-dev-backend \
  --query 'taskDefinition.containerDefinitions[0].healthCheck'

# Test health endpoint manually
aws ecs execute-command --cluster parrot-dev-backend --task <task-arn> --container backend --interactive --command "curl http://localhost:3001/api/health"
```

**Fix:** Ensure:
- Health endpoint is accessible at `/api/health`
- Database connection is working
- Application starts within grace period (180s)

### 2. **Application Crashes**
**Symptoms:**
- Tasks exit with non-zero exit code
- Errors in CloudWatch logs

**Debug:**
```bash
# Check logs for errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/parrot-dev-backend \
  --filter-pattern "ERROR" \
  --region us-east-1
```

**Common causes:**
- Database connection failures
- Missing environment variables
- Migration failures
- Unhandled exceptions

### 3. **Out of Memory**
**Symptoms:**
- Tasks killed by OOM killer
- `stoppedReason: "OutOfMemoryError"`

**Debug:**
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=parrot-dev-backend Name=ClusterName,Value=parrot-dev-backend \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Fix:** Increase `task_memory` in Terraform

### 4. **Database Connection Issues**
**Symptoms:**
- Health check fails (database check fails)
- Connection timeout errors in logs

**Debug:**
```bash
# Check if DATABASE_URL is set correctly
aws ecs execute-command --cluster parrot-dev-backend --task <task-arn> --container backend --interactive --command "echo \$DATABASE_URL"

# Test database connection
aws ecs execute-command --cluster parrot-dev-backend --task <task-arn> --container backend --interactive --command "npx prisma db execute --stdin" <<< "SELECT 1"
```

**Fix:** Ensure:
- DATABASE_URL secret is correctly configured
- Security groups allow ECS to access RDS
- Database is accessible from ECS subnet

### 5. **Migration Failures**
**Symptoms:**
- Tasks exit during startup
- Migration errors in logs

**Debug:**
```bash
# Check migration logs
aws logs filter-log-events \
  --log-group-name /aws/ecs/parrot-dev-backend \
  --filter-pattern "migration migrate" \
  --region us-east-1
```

**Fix:** 
- Check `docker-entrypoint.sh` logs
- Manually run migrations if needed:
  ```bash
  aws ecs execute-command --cluster parrot-dev-backend --task <task-arn> --container backend --interactive --command "npx prisma migrate deploy"
  ```

---

## 📊 Monitoring Recommendations

### CloudWatch Alarms
Set up alarms for:
1. **Service Desired Count vs Running Count**
2. **Task Stopped Events**
3. **Memory Utilization > 80%**
4. **CPU Utilization > 80%**
5. **Health Check Failures**

### Example Alarm
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name ecs-backend-restarts \
  --alarm-description "Alert when ECS backend tasks restart" \
  --metric-name StoppedTasks \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## ✅ Verification Checklist

After applying fixes, verify:

- [ ] ECS service shows `runningCount == desiredCount`
- [ ] Tasks stay running (no constant restarts)
- [ ] Health checks pass: `curl https://your-domain/api/health`
- [ ] CloudWatch logs show successful startup
- [ ] No errors in recent logs
- [ ] Database migrations complete successfully
- [ ] Application responds to requests

---

## 🆘 Emergency Procedures

### If Service Keeps Restarting

1. **Stop the service temporarily:**
   ```bash
   aws ecs update-service \
     --cluster parrot-dev-backend \
     --service parrot-dev-backend \
     --desired-count 0 \
     --region us-east-1
   ```

2. **Investigate using debug script:**
   ```bash
   ./debug-ecs-service.sh
   ```

3. **Check logs for root cause**

4. **Fix the issue** (database, secrets, code, etc.)

5. **Restart service:**
   ```bash
   aws ecs update-service \
     --cluster parrot-dev-backend \
     --service parrot-dev-backend \
     --desired-count 1 \
     --region us-east-1
   ```

---

## 📝 Notes

- Health check grace period is now 180 seconds (3 minutes) to allow for migrations
- Increased resources: 512 CPU, 1024MB memory
- Health check endpoint: `/api/health` (HealthController)
- Logs are in CloudWatch: `/aws/ecs/parrot-dev-backend`

