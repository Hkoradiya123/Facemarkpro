#!/usr/bin/env python
"""
Generate self-signed SSL certificate for HTTPS support
This allows camera access when accessing the app from network devices
"""

import os
import sys
from datetime import datetime, timedelta

try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("❌ Error: cryptography module not found")
    print("\nInstall it with:")
    print("  pip install cryptography")
    sys.exit(1)

def generate_certificate():
    """Generate self-signed SSL certificate"""
    print("=" * 60)
    print("Generating Self-Signed SSL Certificate")
    print("=" * 60)
    
    # Generate private key
    print("\n1. Generating private key...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get local IP address
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    # Create certificate
    print("2. Creating certificate...")
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Maharashtra"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"Mumbai"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"FaceMark Pro"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])
    
    # Add Subject Alternative Names (SAN) for localhost and local IP
    san_list = [
        x509.DNSName(u"localhost"),
        x509.DNSName(u"127.0.0.1"),
        x509.IPAddress(b"\x7f\x00\x00\x01"),  # 127.0.0.1
    ]
    
    # Parse local IP and add to SAN
    try:
        ip_parts = [int(p) for p in local_ip.split('.')]
        san_list.append(x509.IPAddress(bytes(ip_parts)))
        san_list.append(x509.DNSName(local_ip))
    except:
        pass
    
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(san_list),
            critical=False,
        )
        .sign(private_key, hashes.SHA256(), default_backend())
    )
    
    # Write private key to file
    print("3. Writing key.pem...")
    with open("key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    # Write certificate to file
    print("4. Writing cert.pem...")
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    print("\n" + "=" * 60)
    print("✓ SSL Certificate Generated Successfully!")
    print("=" * 60)
    print("\nFiles created:")
    print("  ✓ cert.pem - SSL certificate")
    print("  ✓ key.pem  - Private key")
    print(f"\nValid for: 365 days")
    print(f"Hostnames: localhost, 127.0.0.1, {local_ip}")
    
    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("\n1. Add to your .env file:")
    print("   USE_HTTPS=true")
    print("\n2. Restart your Flask app:")
    print("   python run.py")
    print(f"\n3. Access your app via HTTPS:")
    print(f"   https://localhost:7860")
    print(f"   https://{local_ip}:7860")
    print("\n4. Accept the security warning in your browser:")
    print("   - Click 'Advanced' or 'Show Details'")
    print("   - Click 'Proceed to localhost (unsafe)' or similar")
    print("   - This is safe for development purposes")
    
    print("\n" + "=" * 60)
    print("⚠ IMPORTANT NOTES:")
    print("=" * 60)
    print("- This is a SELF-SIGNED certificate for development only")
    print("- Browsers will show a security warning - this is expected")
    print("- For production, use a proper SSL certificate (Let's Encrypt)")
    print("- Camera access will now work from any device on your network")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    try:
        generate_certificate()
    except Exception as e:
        print(f"\n❌ Error generating certificate: {e}")
        sys.exit(1)
