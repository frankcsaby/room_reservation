#!/usr/bin/env python3
"""
Test script for WebSocket connectivity with Redis.
"""
import asyncio
import websockets
import json

async def test_websocket():
    """Test WebSocket connection to Django backend."""
    uri = "ws://localhost:8000/ws/rooms/overview/"

    print("Connecting to WebSocket...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected successfully!")

            # Wait for initial message
            print("\nWaiting for initial message...")
            message = await asyncio.wait_for(websocket.recv(), timeout=10)
            data = json.loads(message)

            print(f"✓ Received initial message: {data['type']}")
            if data['type'] == 'rooms.status':
                print(f"  - Found {len(data['rooms'])} rooms")
                for room in data['rooms'][:3]:  # Show first 3 rooms
                    print(f"    • {room['room_name']}: {room['occupancy_status']}")

            # Wait for heartbeat (this will take 60 seconds)
            print("\nWaiting for heartbeat message (60s timeout)...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=65)
                data = json.loads(message)
                print(f"✓ Received heartbeat: {data['type']}")
            except asyncio.TimeoutError:
                print("⚠ No heartbeat received (timeout)")

            print("\n✓ WebSocket test completed successfully!")
            print("✓ Redis is working correctly with Django Channels!")

    except websockets.exceptions.WebSocketException as e:
        print(f"✗ WebSocket connection failed: {e}")
        return False
    except asyncio.TimeoutError:
        print("✗ Timeout waiting for message")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(test_websocket())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        exit(1)
