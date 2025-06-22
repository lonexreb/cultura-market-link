#!/usr/bin/env python3
"""
AuraDB Connection Debug Script
"""
import asyncio
from neo4j import AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError


async def test_aura_connection():
    """Test AuraDB connection with detailed error reporting"""
    
    # AuraDB credentials from the user
    uri = "neo4j+s://1a4c0af5.databases.neo4j.io"
    username = "neo4j"
    password = "Sfx8gZ9O2S4mHSBrPtdau0e1assRfrwNw0TK7JMuiJQ"
    database = "neo4j"
    
    print("🔍 AuraDB Connection Debug Test")
    print(f"URI: {uri}")
    print(f"Username: {username}")
    print(f"Database: {database}")
    print("-" * 50)
    
    # Test 1: Basic connection without explicit config
    print("\n📝 Test 1: Basic AuraDB Connection (minimal config)")
    try:
        driver = AsyncGraphDatabase.driver(
            uri,
            auth=(username, password),
        )
        
        async with driver.session(database=database) as session:
            result = await session.run("RETURN 1 as test")
            record = await result.single()
            print(f"✅ SUCCESS: Got result {record['test']}")
            
        await driver.close()
        
    except ServiceUnavailable as e:
        print(f"❌ ServiceUnavailable: {str(e)}")
        print("💡 This usually means routing issues - check URI format")
        
    except AuthError as e:
        print(f"❌ AuthError: {str(e)}")
        print("💡 Check username/password credentials")
        
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {str(e)}")
    
    # Test 2: Try with explicit pool size limits
    print("\n📝 Test 2: With Connection Pool Configuration")
    try:
        driver = AsyncGraphDatabase.driver(
            uri,
            auth=(username, password),
            max_connection_pool_size=10,
            connection_acquisition_timeout=30.0,
        )
        
        async with driver.session(database=database) as session:
            result = await session.run("RETURN 1 as test")
            record = await result.single()
            print(f"✅ SUCCESS: Got result {record['test']}")
            
        await driver.close()
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
    
    # Test 3: Try different database names
    print("\n📝 Test 3: Testing Different Database Names")
    for db_name in [None, "neo4j", "system"]:
        try:
            driver = AsyncGraphDatabase.driver(uri, auth=(username, password))
            
            session_config = {}
            if db_name:
                session_config["database"] = db_name
                
            async with driver.session(**session_config) as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                print(f"✅ SUCCESS with database='{db_name}': Got result {record['test']}")
                
            await driver.close()
            break  # Stop on first success
            
        except Exception as e:
            print(f"❌ Failed with database='{db_name}': {type(e).__name__}: {str(e)}")
    
    # Test 4: Verify URI format
    print("\n📝 Test 4: URI Format Analysis")
    if uri.startswith("neo4j+s://"):
        print("✅ URI format is correct for AuraDB (neo4j+s://)")
    elif uri.startswith("neo4j+ssc://"):
        print("✅ URI format is correct for AuraDB (neo4j+ssc://)")
    else:
        print("❌ URI format may be incorrect for AuraDB")
        print("💡 AuraDB URIs should start with neo4j+s:// or neo4j+ssc://")
    
    # Test 5: Check if URI is accessible
    print("\n📝 Test 5: Domain Resolution Test")
    import socket
    try:
        domain = uri.split("://")[1].split(":")[0]
        print(f"Domain: {domain}")
        ip = socket.gethostbyname(domain)
        print(f"✅ Domain resolves to: {ip}")
    except Exception as e:
        print(f"❌ Domain resolution failed: {str(e)}")
        print("💡 Network connectivity or DNS issues")


if __name__ == "__main__":
    asyncio.run(test_aura_connection()) 