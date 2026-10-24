import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { apiSlice } from '../../api/apiSlice';
import { signedOut } from './authSlice';

// Ends the session: forget the token, drop every cached ticket (it belongs to this session,
// so the next person to use the browser must never see it) and go to the login page.
export default function useSignOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useCallback(() => {
    dispatch(signedOut());
    dispatch(apiSlice.util.resetApiState());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);
}
