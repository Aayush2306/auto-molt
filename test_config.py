#!/usr/bin/env python3
"""
Configuration Test Script
Verifies that all required settings are properly configured
"""

import os
import sys
from dotenv import load_dotenv
import digitalocean
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
END = '\033[0m'

def print_success(message):
    print(f"{GREEN}✓ {message}{END}")

def print_error(message):
    print(f"{RED}✗ {message}{END}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{END}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{END}")

def test_env_file():
    """Test if .env file exists and has required values"""
    print("\n" + "="*50)
    print("Testing Environment Configuration")
    print("="*50)
    
    if not os.path.exists('.env'):
        print_error(".env file not found")
        print_info("Run: cp .env.example .env")
        return False
    
    print_success(".env file exists")
    
    load_dotenv()
    
    # Check DigitalOcean token
    do_token = os.getenv('DIGITALOCEAN_TOKEN')
    if not do_token or do_token == 'your_digitalocean_api_token_here':
        print_error("DIGITALOCEAN_TOKEN not set or using default value")
        print_info("Get your token from: https://cloud.digitalocean.com/account/api/tokens")
        return False
    
    print_success(f"DIGITALOCEAN_TOKEN is set ({do_token[:10]}...)")
    
    # Check SSH key path
    ssh_key_path = os.getenv('SSH_PRIVATE_KEY_PATH', '/root/.ssh/id_rsa')
    if not os.path.exists(ssh_key_path):
        print_error(f"SSH private key not found at: {ssh_key_path}")
        return False
    
    print_success(f"SSH private key found at: {ssh_key_path}")
    
    return True

def test_digitalocean_api():
    """Test DigitalOcean API connection"""
    print("\n" + "="*50)
    print("Testing DigitalOcean API Connection")
    print("="*50)
    
    load_dotenv()
    do_token = os.getenv('DIGITALOCEAN_TOKEN')
    
    if not do_token:
        print_error("Cannot test API without token")
        return False
    
    try:
        manager = digitalocean.Manager(token=do_token)
        
        # Test API access
        print_info("Fetching account information...")
        account = manager.get_account()
        print_success(f"Connected to DigitalOcean account: {account.email}")
        print_info(f"Account status: {account.status}")
        print_info(f"Droplet limit: {account.droplet_limit}")
        
        # Check SSH keys
        print_info("\nFetching SSH keys...")
        ssh_keys = manager.get_all_sshkeys()
        
        if not ssh_keys:
            print_warning("No SSH keys found in your DigitalOcean account")
            print_info("Upload your key at: https://cloud.digitalocean.com/account/security")
            return False
        
        print_success(f"Found {len(ssh_keys)} SSH key(s):")
        for key in ssh_keys:
            print(f"  - {key.name} (ID: {key.id})")
        
        # Check available regions
        print_info("\nFetching available regions...")
        regions = manager.get_all_regions()
        available_regions = [r.slug for r in regions if r.available]
        print_success(f"Found {len(available_regions)} available regions")
        print_info(f"Popular regions: {', '.join(available_regions[:5])}")
        
        return True
        
    except Exception as e:
        print_error(f"DigitalOcean API test failed: {str(e)}")
        return False

def test_dependencies():
    """Test if all Python dependencies are installed"""
    print("\n" + "="*50)
    print("Testing Python Dependencies")
    print("="*50)
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'digitalocean',
        'paramiko',
        'pydantic',
        'sqlalchemy',
        'dotenv'
    ]
    
    all_installed = True
    for package in required_packages:
        try:
            __import__(package)
            print_success(f"{package} is installed")
        except ImportError:
            print_error(f"{package} is NOT installed")
            all_installed = False
    
    if not all_installed:
        print_info("\nInstall missing packages with: pip install -r requirements.txt")
    
    return all_installed

def test_database():
    """Test database connection"""
    print("\n" + "="*50)
    print("Testing Database")
    print("="*50)
    
    try:
        from database import init_db, SessionLocal
        
        # Initialize database
        init_db()
        print_success("Database initialized successfully")
        
        # Test connection
        db = SessionLocal()
        db.close()
        print_success("Database connection successful")
        
        # Check if database file exists
        if os.path.exists('openclaw_platform.db'):
            size = os.path.getsize('openclaw_platform.db')
            print_info(f"Database file size: {size} bytes")
        
        return True
        
    except Exception as e:
        print_error(f"Database test failed: {str(e)}")
        return False

def main():
    print(f"\n{BLUE}╔═══════════════════════════════════════════════════╗{END}")
    print(f"{BLUE}║   OpenClaw Platform - Configuration Test         ║{END}")
    print(f"{BLUE}╚═══════════════════════════════════════════════════╝{END}")
    
    results = {
        "Environment": test_env_file(),
        "Dependencies": test_dependencies(),
        "Database": test_database(),
        "DigitalOcean API": test_digitalocean_api()
    }
    
    # Summary
    print("\n" + "="*50)
    print("Test Summary")
    print("="*50)
    
    all_passed = True
    for test_name, passed in results.items():
        if passed:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")
            all_passed = False
    
    print("\n" + "="*50)
    
    if all_passed:
        print_success("All tests passed! 🎉")
        print_info("\nYou can now start the platform:")
        print("  python main.py")
        return 0
    else:
        print_error("Some tests failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
