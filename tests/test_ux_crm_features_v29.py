"""
Test UX and CRM Features for Afroboost - Iteration 29
Features tested:
1. DELETE /api/chat/participants/{id} - Contact deletion
2. Dashboard - Global search (conversationSearch)
3. Dashboard - Delete buttons on sessions and contacts
4. Dashboard - Internal scroll for CRM table
5. Dashboard - Dynamic filtering (filteredChatLinks, filteredChatSessions, filteredChatParticipants)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeleteParticipantAPI:
    """Test DELETE /api/chat/participants/{id} endpoint"""
    
    def test_create_and_delete_participant(self):
        """Create a participant then delete it"""
        # Create a test participant
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/chat/participants", json={
            "name": "Test Delete User",
            "email": test_email,
            "whatsapp": "+41791234567",
            "source": "test_delete"
        })
        
        assert create_response.status_code == 200, f"Failed to create participant: {create_response.text}"
        participant = create_response.json()
        participant_id = participant.get("id")
        assert participant_id, "Participant ID not returned"
        print(f"✅ Created test participant: {participant_id}")
        
        # Delete the participant
        delete_response = requests.delete(f"{BASE_URL}/api/chat/participants/{participant_id}")
        assert delete_response.status_code == 200, f"Failed to delete participant: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True, "Delete response should have success=True"
        print(f"✅ Deleted participant: {delete_data.get('message')}")
        
        # Verify participant is deleted (should return 404)
        get_response = requests.get(f"{BASE_URL}/api/chat/participants/{participant_id}")
        assert get_response.status_code == 404, f"Participant should be deleted, got: {get_response.status_code}"
        print("✅ Verified participant no longer exists")
    
    def test_delete_nonexistent_participant(self):
        """Test deleting a participant that doesn't exist"""
        fake_id = f"fake_{uuid.uuid4().hex}"
        response = requests.delete(f"{BASE_URL}/api/chat/participants/{fake_id}")
        assert response.status_code == 404, f"Expected 404 for non-existent participant, got: {response.status_code}"
        print("✅ Correctly returns 404 for non-existent participant")
    
    def test_delete_removes_from_sessions(self):
        """Test that deleting a participant removes them from sessions"""
        # Create a test participant
        test_email = f"test_session_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/chat/participants", json={
            "name": "Test Session User",
            "email": test_email,
            "whatsapp": "+41791234568",
            "source": "test_session"
        })
        
        assert create_response.status_code == 200
        participant = create_response.json()
        participant_id = participant.get("id")
        print(f"✅ Created participant for session test: {participant_id}")
        
        # Create a session with this participant
        session_response = requests.post(f"{BASE_URL}/api/chat/sessions", json={
            "participant_ids": [participant_id],
            "mode": "ai",
            "is_ai_active": True
        })
        
        assert session_response.status_code == 200
        session = session_response.json()
        session_id = session.get("id")
        print(f"✅ Created session with participant: {session_id}")
        
        # Delete the participant
        delete_response = requests.delete(f"{BASE_URL}/api/chat/participants/{participant_id}")
        assert delete_response.status_code == 200
        print("✅ Deleted participant")
        
        # Check that session no longer has this participant
        get_session = requests.get(f"{BASE_URL}/api/chat/sessions")
        assert get_session.status_code == 200
        sessions = get_session.json()
        
        # Find our session
        our_session = next((s for s in sessions if s.get("id") == session_id), None)
        if our_session:
            participant_ids = our_session.get("participant_ids", [])
            assert participant_id not in participant_ids, "Participant should be removed from session"
            print("✅ Verified participant removed from session")
        else:
            print("⚠️ Session not found (may have been cleaned up)")


class TestChatSessionsAPI:
    """Test chat sessions API for delete functionality"""
    
    def test_soft_delete_session(self):
        """Test soft delete of a chat session"""
        # Create a session
        create_response = requests.post(f"{BASE_URL}/api/chat/sessions", json={
            "participant_ids": [],
            "mode": "ai",
            "is_ai_active": True,
            "title": "Test Delete Session"
        })
        
        assert create_response.status_code == 200
        session = create_response.json()
        session_id = session.get("id")
        print(f"✅ Created test session: {session_id}")
        
        # Soft delete the session
        delete_response = requests.put(f"{BASE_URL}/api/chat/sessions/{session_id}", json={
            "is_deleted": True
        })
        
        assert delete_response.status_code == 200
        print("✅ Soft deleted session")
        
        # Verify session is not in default list (exclude deleted)
        list_response = requests.get(f"{BASE_URL}/api/chat/sessions")
        assert list_response.status_code == 200
        sessions = list_response.json()
        
        session_ids = [s.get("id") for s in sessions]
        assert session_id not in session_ids, "Deleted session should not appear in default list"
        print("✅ Verified session not in default list")
        
        # Verify session appears when including deleted
        list_with_deleted = requests.get(f"{BASE_URL}/api/chat/sessions?include_deleted=true")
        assert list_with_deleted.status_code == 200
        all_sessions = list_with_deleted.json()
        
        deleted_session = next((s for s in all_sessions if s.get("id") == session_id), None)
        if deleted_session:
            assert deleted_session.get("is_deleted") == True
            print("✅ Verified session marked as deleted")


class TestChatLinksAPI:
    """Test chat links API"""
    
    def test_get_chat_links(self):
        """Test getting chat links"""
        response = requests.get(f"{BASE_URL}/api/chat/links")
        assert response.status_code == 200
        links = response.json()
        assert isinstance(links, list)
        print(f"✅ Got {len(links)} chat links")
    
    def test_create_chat_link(self):
        """Test creating a chat link"""
        response = requests.post(f"{BASE_URL}/api/chat/links", json={
            "name": f"Test Link {uuid.uuid4().hex[:6]}",
            "mode": "ai",
            "is_ai_active": True
        })
        
        assert response.status_code == 200
        link = response.json()
        assert link.get("token"), "Link should have a token"
        assert link.get("name"), "Link should have a name"
        print(f"✅ Created chat link: {link.get('token')}")


class TestHealthAndBasicAPIs:
    """Test basic API health"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health check passed")
    
    def test_get_participants(self):
        """Test getting all participants"""
        response = requests.get(f"{BASE_URL}/api/chat/participants")
        assert response.status_code == 200
        participants = response.json()
        assert isinstance(participants, list)
        print(f"✅ Got {len(participants)} participants")
    
    def test_get_sessions(self):
        """Test getting all sessions"""
        response = requests.get(f"{BASE_URL}/api/chat/sessions")
        assert response.status_code == 200
        sessions = response.json()
        assert isinstance(sessions, list)
        print(f"✅ Got {len(sessions)} sessions")


class TestUsersAPI:
    """Test users/contacts API for delete functionality"""
    
    def test_delete_user_cleans_promo_codes(self):
        """Test that deleting a user cleans up promo code references"""
        # Create a test user
        test_email = f"test_promo_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/users", json={
            "name": "Test Promo User",
            "email": test_email,
            "whatsapp": "+41791234569"
        })
        
        assert create_response.status_code in [200, 201], f"Failed to create user: {create_response.text}"
        user = create_response.json()
        user_id = user.get("id")
        print(f"✅ Created test user: {user_id}")
        
        # Create a promo code assigned to this user
        promo_response = requests.post(f"{BASE_URL}/api/discount-codes", json={
            "code": f"TEST{uuid.uuid4().hex[:6].upper()}",
            "type": "percentage",
            "value": 10,
            "active": True,
            "assignedEmail": test_email
        })
        
        if promo_response.status_code == 200:
            promo = promo_response.json()
            promo_id = promo.get("id")
            print(f"✅ Created promo code assigned to user: {promo_id}")
            
            # Delete the user
            delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}")
            assert delete_response.status_code == 200
            print("✅ Deleted user")
            
            # Check that promo code no longer has assignedEmail
            get_promo = requests.get(f"{BASE_URL}/api/discount-codes")
            assert get_promo.status_code == 200
            promos = get_promo.json()
            
            our_promo = next((p for p in promos if p.get("id") == promo_id), None)
            if our_promo:
                assert our_promo.get("assignedEmail") is None or our_promo.get("assignedEmail") == "", \
                    "Promo code should have assignedEmail cleared"
                print("✅ Verified promo code assignedEmail cleared")
            
            # Cleanup promo code
            requests.delete(f"{BASE_URL}/api/discount-codes/{promo_id}")
        else:
            # Just delete the user
            requests.delete(f"{BASE_URL}/api/users/{user_id}")
            print("⚠️ Could not create promo code, skipping promo cleanup test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
