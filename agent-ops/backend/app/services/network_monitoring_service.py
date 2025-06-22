"""
Network Monitoring Service for tracking outgoing HTTP requests
"""
import uuid
import time
import asyncio
import httpx
import requests
import psutil
from typing import Dict, List, Any, Optional, AsyncGenerator, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json
import threading
from contextlib import asynccontextmanager

from ..models.network_models import (
    NetworkOperation,
    NetworkSession,
    NetworkMetrics,
    NetworkOperationType,
    NetworkOperationStatus,
    NetworkRequestHeaders,
    NetworkResponseData,
    NetworkMonitoringFilter,
    NetworkStreamEvent,
    NetworkHealthResponse,
    NetworkAnalyticsSummary
)


class NetworkMonitoringService:
    """Service for monitoring and tracking outgoing HTTP requests"""
    
    def __init__(self):
        self.operations: Dict[str, NetworkOperation] = {}
        self.sessions: Dict[str, NetworkSession] = {}
        self.active_operations: Dict[str, NetworkOperation] = {}
        self.completed_operations: deque = deque(maxlen=10000)  # Keep last 10k operations
        self.subscribers: List[Callable[[NetworkStreamEvent], None]] = []
        self.start_time = time.time()
        self._lock = threading.Lock()
        
        # Metrics tracking
        self.metrics_cache: Optional[NetworkMetrics] = None
        self.last_metrics_update = time.time()
        self.metrics_cache_duration = 10  # seconds
        
        # Performance monitoring
        self.cpu_usage_history = deque(maxlen=100)
        self.memory_usage_history = deque(maxlen=100)
        
        # Start background tasks
        self._start_background_tasks()
        
        # Import the safe HTTP tracker
        from .http_request_tracker import http_tracker
        self.http_tracker = http_tracker
        
        # Mock data disabled - now tracking real HTTP requests
    
    def _start_background_tasks(self):
        """Start background monitoring tasks"""
        # Start system metrics collection
        threading.Timer(5.0, self._collect_system_metrics).start()
    
    # HTTP monitoring methods disabled to prevent interference
    # def _setup_http_monitoring(self): ... 
    
    def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_info = psutil.virtual_memory()
            
            self.cpu_usage_history.append({
                'timestamp': datetime.now(),
                'value': cpu_percent
            })
            
            self.memory_usage_history.append({
                'timestamp': datetime.now(),
                'value': memory_info.used / (1024 * 1024)  # MB
            })
            
        except Exception as e:
            print(f"Error collecting system metrics: {e}")
        
        # Schedule next collection
        threading.Timer(5.0, self._collect_system_metrics).start()
    
    def _add_mock_data(self):
        """Add some mock HTTP requests for demonstration"""
        try:
            # Add some sample API calls that would typically happen
            mock_requests = [
                ("GET", "https://api.openai.com/v1/models", 200, 145),
                ("POST", "https://api.openai.com/v1/completions", 200, 1250),
                ("GET", "https://api.groq.com/v1/models", 200, 89),
                ("POST", "https://api.anthropic.com/v1/messages", 200, 2100),
                ("GET", "https://api.google.com/v1/models", 200, 156),
            ]
            
            for method, url, status, duration in mock_requests:
                operation = self.http_tracker.add_mock_operation(method, url, status, duration)
                # Also add to our operations for compatibility
                with self._lock:
                    self.operations[operation.id] = operation
                    self.completed_operations.append(operation)
        except Exception as e:
            print(f"Error adding mock data: {e}")
    
    def get_tracked_operations(self, limit: int = 50) -> List[NetworkOperation]:
        """Get operations from the HTTP tracker"""
        try:
            return self.http_tracker.get_operations(limit)
        except Exception as e:
            print(f"Error getting tracked operations: {e}")
            return []
    
    @asynccontextmanager
    async def track_operation(
        self,
        operation_type: NetworkOperationType,
        context: Dict[str, Any] = None
    ) -> NetworkOperation:
        """Context manager for tracking network operations"""
        operation_id = str(uuid.uuid4())
        operation = NetworkOperation(
            id=operation_id,
            operation_type=operation_type,
            status=NetworkOperationStatus.PENDING,
            metadata=context or {}
        )
        
        # Start tracking
        self.start_operation(operation)
        
        try:
            yield operation
            # Operation completed successfully
            self.complete_operation(operation_id, status=NetworkOperationStatus.COMPLETED)
        except Exception as e:
            # Operation failed
            self.complete_operation(
                operation_id, 
                status=NetworkOperationStatus.FAILED,
                error_message=str(e)
            )
            raise
    
    def start_operation(self, operation: NetworkOperation) -> str:
        """Start tracking a network operation"""
        operation.start_time = datetime.now()
        operation.status = NetworkOperationStatus.RUNNING
        
        with self._lock:
            self.operations[operation.id] = operation
            self.active_operations[operation.id] = operation
        
        # Notify subscribers
        self._notify_subscribers(NetworkStreamEvent(
            event_type="operation_start",
            operation=operation
        ))
        
        return operation.id
    
    def update_operation(
        self,
        operation_id: str,
        **updates
    ) -> bool:
        """Update an existing operation"""
        with self._lock:
            if operation_id not in self.operations:
                return False
            
            operation = self.operations[operation_id]
            
            # Update fields
            for key, value in updates.items():
                if hasattr(operation, key):
                    setattr(operation, key, value)
            
            # Notify subscribers
            self._notify_subscribers(NetworkStreamEvent(
                event_type="operation_update",
                operation=operation
            ))
            
            return True
    
    def complete_operation(
        self,
        operation_id: str,
        status: NetworkOperationStatus = NetworkOperationStatus.COMPLETED,
        **updates
    ) -> bool:
        """Complete a network operation"""
        with self._lock:
            if operation_id not in self.operations:
                return False
            
            operation = self.operations[operation_id]
            operation.status = status
            operation.end_time = datetime.now()
            
            # Calculate duration
            if operation.start_time:
                duration = (operation.end_time - operation.start_time).total_seconds() * 1000
                operation.duration_ms = duration
            
            # Apply any additional updates
            for key, value in updates.items():
                if hasattr(operation, key):
                    setattr(operation, key, value)
            
            # Move from active to completed
            if operation_id in self.active_operations:
                del self.active_operations[operation_id]
            
            self.completed_operations.append(operation)
            
            # Invalidate metrics cache
            self.metrics_cache = None
            
            # Notify subscribers
            self._notify_subscribers(NetworkStreamEvent(
                event_type="operation_complete",
                operation=operation
            ))
            
            return True
    
    def get_operation(self, operation_id: str) -> Optional[NetworkOperation]:
        """Get a specific operation by ID"""
        return self.operations.get(operation_id)
    
    def get_operations(self, filter_params: NetworkMonitoringFilter = None) -> List[NetworkOperation]:
        """Get operations with optional filtering"""
        # Get operations from HTTP tracker (where the real data is)
        limit = filter_params.limit if filter_params and filter_params.limit else 100
        all_operations = self.http_tracker.get_operations(limit * 2)  # Get more to allow for filtering
        
        if not filter_params:
            return all_operations[:limit]
        
        # Apply filters
        filtered_ops = all_operations
        
        if filter_params.operation_types:
            filtered_ops = [op for op in filtered_ops if op.operation_type in filter_params.operation_types]
        
        if filter_params.status_filter:
            filtered_ops = [op for op in filtered_ops if op.status in filter_params.status_filter]
        
        if filter_params.workflow_id:
            filtered_ops = [op for op in filtered_ops if op.workflow_id == filter_params.workflow_id]
        
        if filter_params.node_id:
            filtered_ops = [op for op in filtered_ops if op.node_id == filter_params.node_id]
        
        if filter_params.start_time:
            filtered_ops = [op for op in filtered_ops if op.start_time >= filter_params.start_time]
        
        if filter_params.end_time:
            filtered_ops = [op for op in filtered_ops if op.start_time <= filter_params.end_time]
        
        # Sort by start time (most recent first)
        filtered_ops.sort(key=lambda x: x.start_time or datetime.min, reverse=True)
        
        # Apply pagination
        start_idx = filter_params.offset or 0
        end_idx = start_idx + limit
        
        return filtered_ops[start_idx:end_idx]
    
    def get_metrics(self) -> NetworkMetrics:
        """Get aggregated network metrics"""
        current_time = time.time()
        
        # Check cache
        if (self.metrics_cache and 
            current_time - self.last_metrics_update < self.metrics_cache_duration):
            return self.metrics_cache
        
        # Calculate fresh metrics from HTTP tracker
        all_operations = self.http_tracker.get_operations(1000)  # Get more operations for metrics
        completed_operations = [op for op in all_operations if op.status in [
            NetworkOperationStatus.COMPLETED, 
            NetworkOperationStatus.FAILED
        ]]
        
        if not completed_operations:
            return NetworkMetrics()
        
        # Basic metrics
        total_requests = len(completed_operations)
        successful_requests = len([op for op in completed_operations if op.status == NetworkOperationStatus.COMPLETED])
        failed_requests = total_requests - successful_requests
        
        # Response time metrics
        durations = [op.duration_ms for op in completed_operations if op.duration_ms is not None]
        avg_response_time = sum(durations) / len(durations) if durations else 0
        min_response_time = min(durations) if durations else 0
        max_response_time = max(durations) if durations else 0
        
        # Byte metrics
        total_bytes_sent = sum(op.request_size_bytes or 0 for op in completed_operations)
        total_bytes_received = sum(
            op.response.response_size_bytes or 0 
            for op in completed_operations 
            if op.response
        )
        
        # Operations by type
        operations_by_type = defaultdict(int)
        duration_by_type = defaultdict(list)
        
        for op in completed_operations:
            operations_by_type[op.operation_type.value] += 1
            if op.duration_ms:
                duration_by_type[op.operation_type.value].append(op.duration_ms)
        
        avg_duration_by_type = {
            op_type: sum(durations) / len(durations) if durations else 0
            for op_type, durations in duration_by_type.items()
        }
        
        # Timeline data (last 24 hours in 1-hour buckets)
        now = datetime.now()
        hour_buckets = {}
        
        for i in range(24):
            bucket_time = now - timedelta(hours=i)
            hour_key = bucket_time.strftime('%Y-%m-%d %H:00')
            hour_buckets[hour_key] = {'requests': 0, 'avg_response_time': 0, 'total_duration': 0}
        
        for op in completed_operations:
            if op.start_time:
                hour_key = op.start_time.strftime('%Y-%m-%d %H:00')
                if hour_key in hour_buckets:
                    hour_buckets[hour_key]['requests'] += 1
                    if op.duration_ms:
                        hour_buckets[hour_key]['total_duration'] += op.duration_ms
        
        # Calculate average response times for timeline
        requests_over_time = []
        response_times_over_time = []
        
        for hour_key, data in sorted(hour_buckets.items()):
            requests_over_time.append({
                'timestamp': hour_key,
                'value': data['requests']
            })
            
            avg_time = data['total_duration'] / data['requests'] if data['requests'] > 0 else 0
            response_times_over_time.append({
                'timestamp': hour_key,
                'value': avg_time
            })
        
        # Requests per second (based on last hour)
        last_hour_ops = [
            op for op in completed_operations 
            if op.start_time and op.start_time > now - timedelta(hours=1)
        ]
        requests_per_second = len(last_hour_ops) / 3600 if last_hour_ops else 0
        
        # Error rate
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Token metrics (for AI operations)
        total_tokens = sum(op.tokens_used or 0 for op in completed_operations)
        total_cost = sum(op.cost_usd or 0 for op in completed_operations)
        avg_tokens_per_request = total_tokens / total_requests if total_requests > 0 else 0
        
        metrics = NetworkMetrics(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_response_time_ms=avg_response_time,
            min_response_time_ms=min_response_time,
            max_response_time_ms=max_response_time,
            total_bytes_sent=total_bytes_sent,
            total_bytes_received=total_bytes_received,
            requests_per_second=requests_per_second,
            error_rate_percent=error_rate,
            total_tokens_used=total_tokens,
            total_tokens_cost_usd=total_cost,
            avg_tokens_per_request=avg_tokens_per_request,
            operations_by_type=dict(operations_by_type),
            avg_duration_by_type=avg_duration_by_type,
            requests_over_time=requests_over_time,
            response_times_over_time=response_times_over_time
        )
        
        # Cache the result
        self.metrics_cache = metrics
        self.last_metrics_update = current_time
        
        return metrics
    
    def get_analytics_summary(self) -> NetworkAnalyticsSummary:
        """Get comprehensive analytics summary"""
        metrics = self.get_metrics()
        
        # Create performance metrics copy for detailed analytics
        performance_metrics = NetworkMetrics(
            total_requests=metrics.total_requests,
            successful_requests=metrics.successful_requests,
            failed_requests=metrics.failed_requests,
            average_response_time_ms=metrics.average_response_time_ms,
            min_response_time_ms=metrics.min_response_time_ms,
            max_response_time_ms=metrics.max_response_time_ms,
            total_bytes_sent=metrics.total_bytes_sent,
            total_bytes_received=metrics.total_bytes_received,
            requests_per_second=metrics.requests_per_second,
            error_rate_percent=metrics.error_rate_percent,
            total_tokens_used=metrics.total_tokens_used,
            total_tokens_cost_usd=metrics.total_tokens_cost_usd,
            avg_tokens_per_request=metrics.avg_tokens_per_request,
            operations_by_type=metrics.operations_by_type,
            avg_duration_by_type=metrics.avg_duration_by_type,
            requests_over_time=metrics.requests_over_time,
            response_times_over_time=metrics.response_times_over_time
        )
        
        # Get operations from HTTP tracker (where the real data is)
        tracked_operations = self.http_tracker.get_operations(100)  # Get last 100
        
        # AI usage statistics
        ai_operations = [
            op for op in tracked_operations
            if op.operation_type == NetworkOperationType.HTTP_REQUEST and 
            any(domain in (op.url or '') for domain in ['openai.com', 'anthropic.com', 'groq.com', 'googleapis.com'])
        ]
        
        ai_usage = {
            'total_ai_requests': len(ai_operations),
            'ai_providers': {},
            'total_tokens_by_provider': {},
            'cost_by_provider': {}
        }
        
        for op in ai_operations:
            provider = 'unknown'
            if 'openai.com' in (op.url or ''):
                provider = 'openai'
            elif 'anthropic.com' in (op.url or ''):
                provider = 'anthropic'
            elif 'groq.com' in (op.url or ''):
                provider = 'groq'
            elif 'googleapis.com' in (op.url or ''):
                provider = 'google'
            
            ai_usage['ai_providers'][provider] = ai_usage['ai_providers'].get(provider, 0) + 1
            ai_usage['total_tokens_by_provider'][provider] = ai_usage['total_tokens_by_provider'].get(provider, 0) + (op.tokens_used or 0)
            ai_usage['cost_by_provider'][provider] = ai_usage['cost_by_provider'].get(provider, 0) + (op.cost_usd or 0)
        
        # Timeline data for waterfall view - use tracked operations
        timeline_data = []
        for op in sorted(tracked_operations, key=lambda x: x.start_time or datetime.min):
            if op.start_time and op.duration_ms:
                timeline_data.append({
                    'id': op.id,
                    'operation_type': op.operation_type,
                    'method': op.method,
                    'url': op.url,
                    'start_time': op.start_time.isoformat(),
                    'duration_ms': op.duration_ms,
                    'status': op.status,
                    'response_status_code': op.response.status_code if op.response else None,
                    'tokens_used': op.tokens_used,
                    'cost_usd': op.cost_usd
                })
        
        return NetworkAnalyticsSummary(
            overview=metrics,
            performance=performance_metrics,
            ai_usage=ai_usage,
            timeline_data=timeline_data[-100:],  # Last 100 operations for timeline
            last_updated=datetime.now()
        )
    
    def get_health(self) -> NetworkHealthResponse:
        """Get service health information"""
        uptime = time.time() - self.start_time
        
        # Get current system metrics
        try:
            cpu_percent = psutil.cpu_percent()
            memory_info = psutil.virtual_memory()
            memory_usage_mb = memory_info.used / (1024 * 1024)
        except:
            cpu_percent = 0.0
            memory_usage_mb = 0.0
        
        return NetworkHealthResponse(
            status="healthy",
            active_operations=len(self.active_operations),
            total_operations_tracked=len(self.operations),
            uptime_seconds=uptime,
            memory_usage_mb=memory_usage_mb,
            cpu_usage_percent=cpu_percent
        )
    
    def subscribe_to_events(self, callback: Callable[[NetworkStreamEvent], None]) -> Callable[[], None]:
        """Subscribe to real-time network events"""
        self.subscribers.append(callback)
        
        # Return unsubscribe function
        def unsubscribe():
            if callback in self.subscribers:
                self.subscribers.remove(callback)
        
        return unsubscribe
    
    def _notify_subscribers(self, event: NetworkStreamEvent):
        """Notify all subscribers of a network event"""
        for callback in self.subscribers:
            try:
                callback(event)
            except Exception as e:
                print(f"Error notifying subscriber: {e}")
    
    async def stream_events(self) -> AsyncGenerator[NetworkStreamEvent, None]:
        """Async generator for streaming network events"""
        event_queue = asyncio.Queue()
        
        def queue_event(event: NetworkStreamEvent):
            asyncio.create_task(event_queue.put(event))
        
        unsubscribe = self.subscribe_to_events(queue_event)
        
        try:
            while True:
                event = await event_queue.get()
                yield event
        finally:
            unsubscribe()
    
    def clear_operations(self, older_than_hours: int = 24):
        """Clear old operations to free memory"""
        if older_than_hours == 0:
            # Clear all operations immediately
            with self._lock:
                # Clear HTTP tracker (where the real data is)
                self.http_tracker.clear_operations()
                
                # Clear monitoring service data
                self.operations.clear()
                self.active_operations.clear()
                self.completed_operations.clear()
                
                # Invalidate metrics cache
                self.metrics_cache = None
                
                print("Cleared all network operations")
        else:
            # Clear operations older than specified hours
            cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
            
            with self._lock:
                # Clear from main operations dict
                to_remove = [
                    op_id for op_id, op in self.operations.items()
                    if op.start_time and op.start_time < cutoff_time
                ]
                
                for op_id in to_remove:
                    if op_id in self.operations:
                        del self.operations[op_id]
                    if op_id in self.active_operations:
                        del self.active_operations[op_id]
                
                # Clear from completed operations deque
                # (this will happen automatically due to maxlen)
                
                # Note: HTTP tracker uses a fixed-size deque, so old operations are automatically removed
                
                # Invalidate metrics cache
                self.metrics_cache = None
                
                print(f"Cleared {len(to_remove)} old network operations")


# Global service instance
network_monitoring_service = NetworkMonitoringService() 