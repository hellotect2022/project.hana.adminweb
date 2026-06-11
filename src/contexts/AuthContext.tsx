import privateApi, { publicApi } from "@/services/api";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=> {
        const token = localStorage.getItem("accessToken");
        if (token) {
            privateApi.get('/auth/me')
            .then(res => {setUser(res.data.data)})
            .catch(()=>logout())
            .finally(()=> setLoading(false))
        }else {
            setLoading(false)
        }

    },[]);

    const login = useCallback(async (credential) => {
        const res = await publicApi.post('/auth/login', credential);
        const { accessToken, refreshToken, userInfo } = res.data.data;
    
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(userInfo);
    },[])

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    },[user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)