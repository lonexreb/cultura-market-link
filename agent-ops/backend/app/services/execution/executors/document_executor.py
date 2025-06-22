"""
Document processing node executor
"""
from typing import Any, Dict, List
import re
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class DocumentExecutor(BaseNodeExecutor):
    """Executor for document processing nodes"""
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        
        # Get text input (from config or input data)
        text = ""
        if input_data and isinstance(input_data, str):
            text = input_data
            context.log(LogLevel.DEBUG, f"Using input data as text ({len(text)} chars)", node.id)
        elif "text" in config:
            text = config["text"]
            context.log(LogLevel.DEBUG, f"Using config text ({len(text)} chars)", node.id)
        else:
            raise ValueError("No text input provided in config or input data")
        
        if not text:
            raise ValueError("Text input is empty")
        
        # Process the text
        context.log(LogLevel.INFO, f"Processing document with {len(text)} characters", node.id)
        
        # Extract metadata
        word_count = len(text.split())
        char_count = len(text)
        paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
        
        context.log(LogLevel.DEBUG, f"Document stats: {word_count} words, {char_count} chars, {paragraph_count} paragraphs", node.id)
        
        # Chunk the text
        chunk_size = config.get("chunk_size", 1000)
        chunks = self._chunk_text(text, chunk_size)
        
        context.log(LogLevel.INFO, f"Created {len(chunks)} chunks with size {chunk_size}", node.id)
        
        # Extract entities if requested
        entities = []
        if config.get("extract_entities", False):
            entities = self._extract_simple_entities(text)
            context.log(LogLevel.DEBUG, f"Extracted {len(entities)} entities", node.id)
        
        # Create processed output
        processed_text = "\n\n".join(chunks)
        
        result = {
            "original_text": text,
            "processed_text": processed_text,
            "chunks": chunks,
            "metadata": {
                "word_count": word_count,
                "char_count": char_count,
                "paragraph_count": paragraph_count,
                "chunk_count": len(chunks),
                "chunk_size": chunk_size,
                "entities": entities
            }
        }
        
        context.log(LogLevel.INFO, f"Document processing completed successfully", node.id, {
            "chunks_created": len(chunks),
            "entities_found": len(entities)
        })
        
        return result
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate document node configuration"""
        # Must have either text in config or expect input data
        has_text = "text" in config and isinstance(config["text"], str)
        has_chunk_size = "chunk_size" in config and isinstance(config["chunk_size"], int) and config["chunk_size"] > 0
        
        if has_chunk_size and config["chunk_size"] > 10000:
            return False  # Chunk size too large
        
        return True  # Allow nodes without text (they'll get input data)
    
    def _chunk_text(self, text: str, chunk_size: int) -> List[str]:
        """Split text into chunks"""
        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0
        
        for word in words:
            word_size = len(word) + 1  # +1 for space
            
            if current_size + word_size > chunk_size and current_chunk:
                # Create chunk and start new one
                chunks.append(" ".join(current_chunk))
                current_chunk = [word]
                current_size = word_size
            else:
                current_chunk.append(word)
                current_size += word_size
        
        # Add the last chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks
    
    def _extract_simple_entities(self, text: str) -> List[Dict[str, str]]:
        """Extract simple entities using regex patterns"""
        entities = []
        
        # Email addresses
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            entities.append({"type": "email", "value": email})
        
        # URLs
        urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
        for url in urls:
            entities.append({"type": "url", "value": url})
        
        # Phone numbers (simple pattern)
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
        for phone in phones:
            entities.append({"type": "phone", "value": phone})
        
        # Capitalized words (potential names/places)
        capitalized = re.findall(r'\b[A-Z][a-z]+\b', text)
        # Only include if they appear multiple times or are common name patterns
        for word in set(capitalized):
            if text.count(word) > 1 or len(word) > 2:
                entities.append({"type": "proper_noun", "value": word})
        
        return entities[:50]  # Limit to 50 entities
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with or without input
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "original_text": {"type": "string"},
                "processed_text": {"type": "string"},
                "chunks": {"type": "array", "items": {"type": "string"}},
                "metadata": {"type": "object"}
            }
        } 