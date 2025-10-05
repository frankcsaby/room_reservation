#!/usr/bin/env python
"""
Script to populate the database with sample room data.
Run this script after migrations to add test rooms.

Usage:
    python populate_rooms.py
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Room

def populate_rooms():
    """Create sample rooms in the database"""

    # Clear existing rooms (optional - comment out if you want to keep existing data)
    # Room.objects.all().delete()
    # print("Cleared existing rooms")

    sample_rooms = [
        {
            "name": "Conference Room A",
            "building": "Main Building",
            "floor": 2,
            "capacity": 20,
            "amenities": ["Projector", "Whiteboard", "Video Conference"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
        {
            "name": "Meeting Room B",
            "building": "Science Building",
            "floor": 1,
            "capacity": 10,
            "amenities": ["TV Screen", "Whiteboard"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
        {
            "name": "Lecture Hall 101",
            "building": "Academic Block",
            "floor": 1,
            "capacity": 100,
            "amenities": ["Projector", "Microphone", "Recording Equipment"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
        {
            "name": "Study Room C",
            "building": "Library",
            "floor": 3,
            "capacity": 6,
            "amenities": ["Whiteboard", "WiFi"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
        {
            "name": "Lab Room 202",
            "building": "Science Building",
            "floor": 2,
            "capacity": 30,
            "amenities": ["Computers", "Projector", "Lab Equipment"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
        {
            "name": "Seminar Room D",
            "building": "Main Building",
            "floor": 3,
            "capacity": 15,
            "amenities": ["Projector", "Video Conference", "Whiteboard"],
            "image": "https://via.placeholder.com/400x300",
            "is_active": True
        },
    ]

    created_count = 0
    for room_data in sample_rooms:
        room, created = Room.objects.get_or_create(
            name=room_data["name"],
            building=room_data["building"],
            defaults=room_data
        )
        if created:
            created_count += 1
            print(f"✓ Created: {room.name} in {room.building}")
        else:
            print(f"- Already exists: {room.name} in {room.building}")

    print(f"\n{created_count} rooms created successfully!")
    print(f"Total rooms in database: {Room.objects.count()}")

if __name__ == "__main__":
    print("Populating database with sample rooms...\n")
    populate_rooms()
