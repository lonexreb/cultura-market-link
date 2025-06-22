#!/usr/bin/env python3
"""
AuraDB Connection Fix Script - Multiple approaches to resolve routing issues
"""
import asyncio
import socket
import ssl
from neo4j import AsyncGraphDatabase, GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError, ConfigurationError


async def test_aura_fixes():
    """Test multiple approaches to fix AuraDB routing issues"""
    
    # AuraDB credentials
    uri = "neo4j+s://1a4c0af5.databases.neo4j.io"
    username = "neo4j"
    password = "Sfx8gZ9O2S4mHSBrPtdau0e1assRfrwNw0TK7JMuiJQ"
    database = "neo4j"
    
    print("🔧 AuraDB Connection Fix Script")
    print(f"URI: {uri}")
    print(f"Username: {username}")
    print(f"Database: {database}")
    print("=" * 60)
    
    # Fix 1: Test network connectivity
    print("\n🌐 Fix 1: Network Connectivity Test")
    try:
        domain = uri.split("://")[1].split(":")[0]
        ip = socket.gethostbyname(domain)
        print(f"✅ Domain resolves: {domain} → {ip}")
        
        # Test SSL connection
        context = ssl.create_default_context()
        with socket.create_connection((domain, 7687), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                print(f"✅ SSL connection successful to {domain}:7687")
                
    except Exception as e:
        print(f"❌ Network issue: {str(e)}")
        print("💡 Solution: Check firewall, VPN, or network connectivity")
        return
    
    # Fix 2: Sync driver (sometimes more reliable)
    print("\n🔄 Fix 2: Synchronous Driver Test")
    try:
        sync_driver = GraphDatabase.driver(
            uri,
            auth=(username, password),
            max_connection_pool_size=1,
            connection_acquisition_timeout=30.0
        )
        
        with sync_driver.session(database=database) as session:
            result = session.run("RETURN 1 as test")
            record = result.single()
            print(f"✅ Sync driver SUCCESS: {record['test']}")
            
        sync_driver.close()
        
        # If sync works, async should too with proper config
        print("💡 Sync driver works - issue may be with async configuration")
        
    except Exception as e:
        print(f"❌ Sync driver failed: {str(e)}")
    
    # Fix 3: Different async configurations
    print("\n⚙️ Fix 3: Async Driver with Different Configurations")
    
    configs_to_try = [
        # Minimal config
        {
            "name": "Minimal Config",
            "config": {}
        },
        # Reduced pool size
        {
            "name": "Single Connection",
            "config": {
                "max_connection_pool_size": 1,
                "connection_acquisition_timeout": 60.0
            }
        },
        # Longer timeouts
        {
            "name": "Extended Timeouts",
            "config": {
                "max_connection_pool_size": 1,
                "connection_acquisition_timeout": 120.0,
                "max_connection_lifetime": 3600,
                "max_transaction_retry_time": 60.0
            }
        },
        # Different resolver
        {
            "name": "Custom Resolver",
            "config": {
                "resolver": lambda address: [(domain, 7687)],
                "max_connection_pool_size": 1
            }
        }
    ]
    
    for config_test in configs_to_try:
        try:
            print(f"\n📋 Testing: {config_test['name']}")
            
            driver = AsyncGraphDatabase.driver(
                uri,
                auth=(username, password),
                **config_test['config']
            )
            
            async with driver.session(database=database) as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                print(f"✅ SUCCESS with {config_test['name']}: {record['test']}")
                
                # Test a more complex query
                result = await session.run("MATCH (n) RETURN count(n) as nodeCount LIMIT 1")
                record = await result.single()
                print(f"✅ Node count query: {record['nodeCount'] if record else 0}")
                
            await driver.close()
            
            print(f"🎉 SOLUTION FOUND: Use {config_test['name']}")
            print(f"Config: {config_test['config']}")
            break
            
        except Exception as e:
            print(f"❌ Failed with {config_test['name']}: {str(e)}")
            try:
                await driver.close()
            except:
                pass
    
    # Fix 4: Alternative URI formats
    print("\n🔗 Fix 4: Alternative URI Formats")
    
    alternative_uris = [
        f"neo4j+ssc://{domain}",
        f"bolt+s://{domain}:7687",
        f"bolt+ssc://{domain}:7687"
    ]
    
    for alt_uri in alternative_uris:
        try:
            print(f"\n📋 Testing URI: {alt_uri}")
            
            driver = AsyncGraphDatabase.driver(
                alt_uri,
                auth=(username, password),
                max_connection_pool_size=1
            )
            
            async with driver.session(database=database) as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                print(f"✅ SUCCESS with {alt_uri}: {record['test']}")
                
            await driver.close()
            
            print(f"🎉 ALTERNATIVE URI WORKS: {alt_uri}")
            break
            
        except Exception as e:
            print(f"❌ Failed with {alt_uri}: {str(e)}")
            try:
                await driver.close()
            except:
                pass
    
    # Fix 5: Check neo4j driver version
    print("\n📦 Fix 5: Driver Version Check")
    try:
        import neo4j
        print(f"Neo4j driver version: {neo4j.__version__}")
        
        # Version compatibility info
        version = neo4j.__version__
        if version.startswith("5."):
            print("✅ Using Neo4j 5.x driver (recommended for AuraDB)")
        elif version.startswith("4."):
            print("⚠️ Using Neo4j 4.x driver - consider upgrading to 5.x")
            print("💡 Run: pip install --upgrade neo4j")
        else:
            print(f"❓ Unexpected version: {version}")
            
    except Exception as e:
        print(f"❌ Could not check driver version: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🔍 TROUBLESHOOTING SUMMARY:")
    print("1. If network test failed → Check firewall/VPN")
    print("2. If sync driver worked → Use sync approach temporarily")
    print("3. If specific config worked → Update backend with that config")
    print("4. If alternative URI worked → Use that URI format")
    print("5. If driver version is old → Upgrade neo4j driver")
    print("\n💡 Next steps: Apply the working configuration to the backend service")


if __name__ == "__main__":
    domain = "1a4c0af5.databases.neo4j.io"
    asyncio.run(test_aura_fixes()) 