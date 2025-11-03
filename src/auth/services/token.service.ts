import { Injectable } from '@angular/core';
import { UserInfo} from '../shared/interfaces/auth.interfaces';

@Injectable({
    providedIn: 'root'
})
export class TokenService {
    private readonly STORAGE_KEYS = {
        token: 'access_token',
        user: 'user_info'
    };
    setAuthToken(token: string, user: UserInfo): void{
        localStorage.setItem(this.STORAGE_KEYS.token, token)
        localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(user))
    }
    getToken(): string | null {
        return localStorage.getItem(this.STORAGE_KEYS.token)
    }
    getUserInfo(): UserInfo | null {
        const userStr = localStorage.getItem(this.STORAGE_KEYS.user)
        return userStr ? JSON.parse(userStr) : null;
    }
    clearAuth(): void {
        localStorage.removeItem(this.STORAGE_KEYS.token)
        localStorage.removeItem(this.STORAGE_KEYS.user)
    }
}