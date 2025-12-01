import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import "./App.css";
import BackgroundCanvas from "./Background";
import CorgiSprite from "./CorgiSprite";

function LobbyPage({supabase}) { 
    const [username, setUsername] = useState("");
    const [corgiSkin, setCorgiSkin] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const getUser = async() => {
            const {data: {session}} = await supabase.auth.getSession();
            if (session?.user) {
                setUsername(session.user.user_metadata.username);
                setCorgiSkin(session.user.user_metadata.corgiSkin);
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
            <BackgroundCanvas/>
            <div className="background-rect">
                <div className="lobby-user-info">
                    <h3 className="lobby-username">{username}</h3>
                    <CorgiSprite image_url={`corgi_idle/corgi_${corgiSkin}_idle_1.png`} className="lobby-sprite"/>
                </div>
                    <div className="lobby-buttons">
                        <div className="button-row">
                            <button className="big-button" onClick={customizePageButton}>Customize Your Corgi</button>
                        </div>
                        <div className="button-row">
                            <button className="big-button" onClick={joinGameButton}>Join Game</button>
                        </div>
                        <div className="button-row secondary-buttons">
                            <button className="small-button" onClick={helpPageButton}>Help Page</button>
                            <button className="small-button" onClick={signOutButton}>Sign Out</button>
                        </div>
                </div>
            </div>
        </div>
    )
};

export default LobbyPage;