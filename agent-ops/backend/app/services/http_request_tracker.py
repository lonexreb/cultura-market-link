"""
HTTP Request Tracker - Safe implementation using context managers
"""
import uuid
import time
import asyncio
import httpx
import requests
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
from collections import deque
import threading
from contextlib import asynccontextmanager, contextmanager

from ..models.network_models import (
    NetworkOperation,
    NetworkOperationType,
    NetworkOperationStatus,
    NetworkStreamEvent,
    NetworkResponseData
)


class HTTPRequestTracker:
    """Safe HTTP request tracker using context managers"""
    
    def __init__(self):
        self.operations: deque = deque(maxlen=1000)  # Keep last 1000 requests
        self.active_operations: Dict[str, NetworkOperation] = {}
        self.subscribers: List[Callable[[NetworkStreamEvent], None]] = []
        self._lock = threading.Lock()
    
    @asynccontextmanager
    async def track_httpx_request(self, method: str, url: str, **kwargs):
        """Context manager to track httpx requests"""
        operation_id = str(uuid.uuid4())
        
        # Create operation
        operation = NetworkOperation(
            id=operation_id,
            operation_type=NetworkOperationType.HTTP_REQUEST,
            status=NetworkOperationStatus.RUNNING,
            method=method,
            url=str(url),
            start_time=datetime.now(),
            metadata={
                'library': 'httpx',
                'tracked': True
            }
        )
        
        # Start tracking
        with self._lock:
            self.active_operations[operation_id] = operation
        
        self._notify_subscribers(NetworkStreamEvent(
            event_type="operation_start",
            operation=operation
        ))
        
        try:
            start_time = time.time()
            
            # Use httpx to make the request
            async with httpx.AsyncClient() as client:
                response = await client.request(method, url, **kwargs)
            
            end_time = time.time()
            
            # Update operation with response
            operation.status = NetworkOperationStatus.COMPLETED
            operation.end_time = datetime.now()
            operation.duration_ms = (end_time - start_time) * 1000
            
            # Create proper response object
            operation.response = NetworkResponseData(
                status_code=response.status_code,
                headers=dict(response.headers),
                content_length=len(response.content) if hasattr(response, 'content') else 0,
                response_body=self._safe_get_response_body(response),
                response_size_bytes=len(response.content) if hasattr(response, 'content') else 0,
                content_type=response.headers.get('content-type', 'unknown')
            )
            
            self._complete_operation(operation)
            yield response
            
        except Exception as e:
            # Mark as failed
            operation.status = NetworkOperationStatus.FAILED
            operation.end_time = datetime.now()
            operation.duration_ms = (time.time() - start_time) * 1000 if 'start_time' in locals() else 0
            operation.error_message = str(e)
            
            self._complete_operation(operation)
            raise
    
    @contextmanager
    def track_requests_call(self, method: str, url: str, **kwargs):
        """Context manager to track requests calls"""
        operation_id = str(uuid.uuid4())
        
        # Create operation
        operation = NetworkOperation(
            id=operation_id,
            operation_type=NetworkOperationType.HTTP_REQUEST,
            status=NetworkOperationStatus.RUNNING,
            method=method,
            url=str(url),
            start_time=datetime.now(),
            metadata={
                'library': 'requests',
                'tracked': True
            }
        )
        
        # Start tracking
        with self._lock:
            self.active_operations[operation_id] = operation
        
        self._notify_subscribers(NetworkStreamEvent(
            event_type="operation_start",
            operation=operation
        ))
        
        try:
            start_time = time.time()
            response = requests.request(method, url, **kwargs)
            end_time = time.time()
            
            # Update operation with response
            operation.status = NetworkOperationStatus.COMPLETED
            operation.end_time = datetime.now()
            operation.duration_ms = (end_time - start_time) * 1000
            
            # Create proper response object
            operation.response = NetworkResponseData(
                status_code=response.status_code,
                headers=dict(response.headers),
                content_length=len(response.content) if hasattr(response, 'content') else 0,
                response_body=self._safe_get_response_body(response),
                response_size_bytes=len(response.content) if hasattr(response, 'content') else 0,
                content_type=response.headers.get('content-type', 'unknown')
            )
            
            self._complete_operation(operation)
            yield response
            
        except Exception as e:
            # Mark as failed
            operation.status = NetworkOperationStatus.FAILED
            operation.end_time = datetime.now()
            operation.duration_ms = (time.time() - start_time) * 1000 if 'start_time' in locals() else 0
            operation.error_message = str(e)
            
            self._complete_operation(operation)
            raise
    
    def add_mock_operation(self, method: str, url: str, status_code: int = 200, duration_ms: float = 150):
        """Add a mock operation for testing (temporary method)"""
        operation_id = str(uuid.uuid4())
        
        operation = NetworkOperation(
            id=operation_id,
            operation_type=NetworkOperationType.HTTP_REQUEST,
            status=NetworkOperationStatus.COMPLETED,
            method=method,
            url=url,
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration_ms=duration_ms,
            response=NetworkResponseData(
                status_code=status_code,
                headers={'content-type': 'application/json'},
                content_length=256,
                response_size_bytes=256
            ),
            metadata={
                'library': 'mock',
                'tracked': True
            }
        )
        
        self._complete_operation(operation)
        return operation
    
    def _serialize_body(self, body):
        """Safely serialize request body"""
        if body is None:
            return None
        
        try:
            if isinstance(body, (dict, list)):
                return body
            elif isinstance(body, str):
                return body[:1000]  # Limit size
            else:
                return str(body)[:1000]
        except:
            return "[Could not serialize body]"
    
    def _safe_get_response_body(self, response):
        """Safely get response body"""
        try:
            if hasattr(response, 'json'):
                body = response.json()
                # Limit response size
                if isinstance(body, str):
                    return body[:1000]
                return body
            elif hasattr(response, 'text'):
                return response.text[:1000]
            else:
                return None
        except:
            return "[Could not parse response]"
    
    def _complete_operation(self, operation):
        """Complete an operation and move it to history"""
        with self._lock:
            # Remove from active
            if operation.id in self.active_operations:
                del self.active_operations[operation.id]
            
            # Add to history
            self.operations.append(operation)
        
        # Notify subscribers
        self._notify_subscribers(NetworkStreamEvent(
            event_type="operation_complete",
            operation=operation
        ))
    
    def get_operations(self, limit: int = 50) -> List[NetworkOperation]:
        """Get recent operations"""
        with self._lock:
            return list(self.operations)[-limit:]
    
    def get_active_operations(self) -> List[NetworkOperation]:
        """Get currently active operations"""
        with self._lock:
            return list(self.active_operations.values())
    
    def subscribe_to_events(self, callback: Callable[[NetworkStreamEvent], None]) -> Callable[[], None]:
        """Subscribe to network events"""
        self.subscribers.append(callback)
        
        def unsubscribe():
            if callback in self.subscribers:
                self.subscribers.remove(callback)
        
        return unsubscribe
    
    def _notify_subscribers(self, event: NetworkStreamEvent):
        """Notify all subscribers of an event"""
        for callback in self.subscribers:
            try:
                callback(event)
            except Exception as e:
                print(f"Error notifying subscriber: {e}")
    
    def update_operation(self, operation_id: str, **updates):
        """Update an operation with additional data"""
        with self._lock:
            # Check active operations first
            if operation_id in self.active_operations:
                operation = self.active_operations[operation_id]
                for key, value in updates.items():
                    if hasattr(operation, key):
                        setattr(operation, key, value)
                return True
            
            # Check completed operations
            for operation in reversed(self.operations):
                if operation.id == operation_id:
                    for key, value in updates.items():
                        if hasattr(operation, key):
                            setattr(operation, key, value)
                    return True
            
            return False
    
    def clear_operations(self):
        """Clear all operations"""
        with self._lock:
            self.operations.clear()
            self.active_operations.clear()


# Global instance
http_tracker = HTTPRequestTracker() 