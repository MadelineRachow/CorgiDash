import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import "./App.css";

function LobbyPage({supabase}) { 
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const getUser = async() => {
            const {data: {session}} = await supabase.auth.getSession();
            if (session?.user) {
                setUsername(session.user.user_metadata.username);
            };
        };
        getUser();
    }, [supabase]);

     
    function joinGameButton() {
        navigate("/game");
    };
    
    const signOutButton = async() => {
        const {error} = await supabase.auth.signOut();
        if (error) alert(error.message);
        else navigate("/login");
    };
    
    return (
        <div>
            <p>This is the lobby page</p>
            <p>Username: {username}</p>
            <button onClick={joinGameButton}>Join Game</button>
            <button onClick={signOutButton}>Sign out</button>
        </div>
    )
};

export default LobbyPage;