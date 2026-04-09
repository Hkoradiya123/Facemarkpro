"""
Client for remote face inference service
Handles all communication with the HF Spaces inference service
"""

import requests
import json
import logging
import os
import base64
from typing import List, Dict, Optional
from PIL import Image
import io
import numpy as np

logger = logging.getLogger(__name__)

class InferenceClient:
    """
    Client to communicate with remote face inference service
    """
    
    def __init__(self, service_url: str):
        """
        Initialize inference client
        
        Args:
            service_url: Base URL of inference service (e.g., https://xxx.hf.space)
        """
        self.service_url = service_url.rstrip('/')
        self.timeout = 30
        self._health_checked = False
    
    def health_check(self) -> bool:
        """
        Check if inference service is available
        
        Returns:
            True if service is healthy, False otherwise
        """
        try:
            response = requests.get(
                f"{self.service_url}/health",
                timeout=10
            )
            if response.status_code == 200:
                logger.info(f"✓ Inference service healthy: {self.service_url}")
                self._health_checked = True
                return True
            else:
                logger.error(f"Service health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Cannot reach inference service: {e}")
            return False
    
    def recognize_frame(
        self,
        frame_data: str,
        known_encodings: List[np.ndarray],
        known_metadata: List[Dict],
        tolerance: float = 0.85
    ) -> Optional[List[Dict]]:
        """
        Recognize faces in a frame
        
        Args:
            frame_data: Base64-encoded JPEG image
            known_encodings: List of numpy embeddings
            known_metadata: List of metadata dicts
            tolerance: Distance threshold
        
        Returns:
            List of recognized students or None on error
        """
        try:
            # Serialize encodings as JSON
            encodings_json = json.dumps({
                'encodings': [e.tolist() if isinstance(e, np.ndarray) else e for e in known_encodings],
                'metadata': known_metadata
            })
            
            response = requests.post(
                f"{self.service_url}/recognize",
                data={
                    'frame_data': frame_data,
                    'known_encodings': encodings_json,
                    'tolerance': tolerance
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result.get('recognized', [])
                else:
                    logger.error(f"Recognition failed: {result}")
                    return []
            else:
                logger.error(f"HTTP {response.status_code}: {response.text}")
                return None
                
        except requests.Timeout:
            logger.error("Inference service timeout")
            return None
        except Exception as e:
            logger.error(f"Recognition error: {e}")
            return None
    
    def recognize_batch(
        self,
        frames: List[str],
        known_encodings: List[np.ndarray],
        known_metadata: List[Dict],
        tolerance: float = 0.85
    ) -> Optional[List[str]]:
        """
        Batch recognize faces across multiple frames
        
        Args:
            frames: List of base64-encoded images
            known_encodings: List of numpy embeddings
            known_metadata: List of metadata dicts
            tolerance: Distance threshold
        
        Returns:
            List of unique recognized roll numbers or None on error
        """
        try:
            encodings_json = json.dumps({
                'encodings': [e.tolist() if isinstance(e, np.ndarray) else e for e in known_encodings],
                'metadata': known_metadata
            })
            
            response = requests.post(
                f"{self.service_url}/recognize_batch",
                data={
                    'frames[]': frames,
                    'known_encodings': encodings_json,
                    'tolerance': tolerance
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result.get('recognized', [])
                else:
                    logger.error(f"Batch recognition failed: {result}")
                    return []
            else:
                logger.error(f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Batch recognition error: {e}")
            return None
    
    def get_embedding(self, image_data: str) -> Optional[List[float]]:
        """
        Extract embedding from a single image
        
        Args:
            image_data: Base64-encoded JPEG image
        
        Returns:
            Embedding vector or None on error
        """
        try:
            response = requests.post(
                f"{self.service_url}/get_embedding",
                data={'image_data': image_data},
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result.get('embedding')
                else:
                    logger.error(f"Embedding extraction failed: {result}")
                    return None
            else:
                logger.error(f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return None


def get_inference_client() -> Optional[InferenceClient]:
    """
    Factory function to get inference client from environment
    
    Returns:
        Configured InferenceClient or None if not configured
    """
    service_url = os.environ.get('INFERENCE_SERVICE_URL')
    if not service_url:
        logger.warning("INFERENCE_SERVICE_URL not set; using local face recognition")
        return None
    
    client = InferenceClient(service_url)
    if client.health_check():
        return client
    else:
        logger.warning("Remote inference service unreachable; falling back to local")
        return None
