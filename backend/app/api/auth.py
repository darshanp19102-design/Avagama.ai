from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.mongo import collection
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse
from app.services.emailer import send_verification_email, send_password_reset_email
from app.core.security import create_password_reset_token


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/signup', response_model=TokenResponse)
async def signup(payload: SignupRequest):
    users = collection('users')
    exists = await users.find_one({'email': payload.email.lower()})
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already registered')

    doc = {
        'first_name': payload.first_name.strip(),
        'last_name': payload.last_name.strip(),
        'company_name': payload.company_name,
        'email': payload.email.lower(),
        'password_hash': hash_password(payload.password),
        'email_verified': False,
        'created_at': datetime.now(timezone.utc),
    }
    result = await users.insert_one(doc)
    user_id = str(result.inserted_id)
    verify_token = create_email_verification_token(user_id)
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"

    try:
        email_sent = send_verification_email(doc['email'], verify_link)
        if not email_sent:
            # Delete the inserted doc if it explicitly returns False before throwing
            await users.delete_one({'_id': result.inserted_id})
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Failed to send verification email. Please ensure your email is valid.')
    except Exception as exc:
        # Rollback the user creation
        await users.delete_one({'_id': result.inserted_id})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Invalid email or email server error: {str(exc)}')

    await collection('email_logs').insert_one(
        {
            'user_id': user_id,
            'email': doc['email'],
            'verify_link': verify_link,
            'email_sent': email_sent,
            'created_at': datetime.now(timezone.utc),
        }
    )

    token = create_access_token(user_id)
    return {
        'access_token': token,
        'user': {
            'id': user_id,
            'first_name': doc['first_name'],
            'last_name': doc['last_name'],
            'company_name': doc['company_name'],
            'email': doc['email'],
            'email_verified': doc['email_verified'],
            'created_at': doc['created_at'],
            'verification_email_sent': email_sent,
        },
    }


@router.post('/login', response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await collection('users').find_one({'email': payload.email.lower()})
    if not user or not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    user_id = str(user['_id'])
    # Strict check for email verification
    if not user.get('email_verified', False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Please verify your email address to log in.')

    return {
        'access_token': create_access_token(user_id),
        'user': {
            'id': user_id,
            'first_name': user.get('first_name', ''),
            'last_name': user.get('last_name', ''),
            'company_name': user.get('company_name', ''),
            'email': user['email'],
            'email_verified': True,
            'created_at': user.get('created_at'),
        },
    }


@router.get('/verify-email')
async def verify_email(token: str = Query(...)):
    payload = decode_token(token)
    if not payload or payload.get('type') != 'verify_email' or 'sub' not in payload:
        raise HTTPException(status_code=400, detail='Invalid verification token')

    result = await collection('users').find_one({'_id': ObjectId(payload['sub'])})
    if not result:
        raise HTTPException(status_code=404, detail='User not found')

    await collection('users').update_one({'_id': result['_id']}, {'$set': {'email_verified': True}})
    return {'message': 'Email verified successfully'}


@router.get('/verification-preview')
async def verification_preview(current_user=Depends(get_current_user)):
    cursor = collection('email_logs').find({'user_id': current_user['id']}).sort('created_at', -1)
    async for item in cursor:
        item['id'] = str(item.pop('_id'))
        return item
    raise HTTPException(status_code=404, detail='No verification email log found')


@router.get('/me')
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.post('/forgot-password')
async def forgot_password(payload: ForgotPasswordRequest):
    user = await collection('users').find_one({'email': payload.email.lower()})
    # Always return success to avoid email enumeration
    if user:
        user_id = str(user['_id'])
        reset_token = create_password_reset_token(user_id)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        try:
            send_password_reset_email(user['email'], reset_link)
        except Exception:
            pass
        await collection('password_resets').insert_one({
            'user_id': user_id,
            'token': reset_token,
            'used': False,
            'created_at': datetime.now(timezone.utc),
        })
    return {'message': 'If that email exists, a password reset link has been sent.'}


@router.post('/reset-password')
async def reset_password(payload: ResetPasswordRequest):
    token_data = decode_token(payload.token)
    if not token_data or token_data.get('type') != 'password_reset':
        raise HTTPException(status_code=400, detail='Invalid or expired reset token')
    user_id = token_data.get('sub')
    user = await collection('users').find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    new_hash = hash_password(payload.new_password)
    await collection('users').update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': new_hash, 'email_verified': True}}
    )
    return {'message': 'Password reset successfully. You can now log in.'}
