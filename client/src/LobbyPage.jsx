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


    function customizePageButton() {
        navigate("/customizecorgi");
    };

    function joinGameButton() {
        navigate("/game");
    };

    function helpPageButton() {
        navigate("/help");
    };
    
    const signOutButton = async() => {
        const {error} = await supabase.auth.signOut();
        if (error) alert(error.message);
        else navigate("/login");
    };
    
    return (
        <div>
            <h3>Username: {username}</h3>
            <button onClick={customizePageButton}>Customize your corgi</button>
            <button onClick={joinGameButton}>Join game</button>
            <button onClick={helpPageButton}>Help information page</button>
            <button onClick={signOutButton}>Sign out</button>
        </div>
    )
};

export default LobbyPage;