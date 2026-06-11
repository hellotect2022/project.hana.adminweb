import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";


const PrivateRoute = () => {
    const {user, loading} = useAuth()

    if (loading) {
        return <div>인증 정보 확인 중...</div>; 
    }

    return user ? <Outlet/> : <Navigate to="/login" replace/>
}

export default PrivateRoute;