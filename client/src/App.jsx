import {createClient} from "@supabase/supabase-js";
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import {useState, useEffect} from "react";
import LoginPage from "./LoginPage";
import LobbyPage from "./LobbyPage";

const supabaseURL = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseURL, supabaseAnonKey)

// If user is null/undefined, redirect to the home page
function ProtectedRoute({children, user}) {
    if (!user) return <Navigate to="/" replace/>;
    return children;
};

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on load
    useEffect(() => {
        const checkUser = async() => {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) await supabase.auth.signOut(); // Clear stale session
            setUser(user);
            setLoading(false);
        };
        checkUser();

        // Real-time listener for authentication changes (login, logout, session refresh)
        const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    // Don't render until user session is authenticated
    if (loading) {
        return;
    }

    // If user is logged in, redirect the to lobby (Otherwise, show the login page)
    return (
        <Router>
            <Routes>
                <Route path="/login" element={user ? <Navigate to="/lobby" replace/> : <LoginPage supabase={supabase}/>}/>
                <Route path="/lobby" element={<ProtectedRoute user={user}><LobbyPage supabase={supabase}/></ProtectedRoute>}/>
                <Route path="*" element={<Navigate to={user ? "/lobby" : "/login"} replace/>}/>
            </Routes>
        </Router>
    )
};

export default App;