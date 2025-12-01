import {useNavigate} from 'react-router-dom';
import "./App.css";

function HelpPage() { 
    const navigate = useNavigate();

    function returnToLobby() {
        navigate("/lobby");
    };

    return (
        <div>
            <button className="corner-button" onClick={returnToLobby}>Back to Lobby</button>
            <div className="background-rect long-page">
                <div class="scroll-wrapper">
                    <h3>Help Page</h3>
                    <ul>
                        <li><strong>Objective:</strong> Be the first corgi to cross the finish line!</li>
                        <li><strong>Controls:</strong> Your corgi runs automatically. Use <strong>W / ↑</strong> to move up and <strong>S / ↓</strong> to move down to avoid obstacles and collect boosts.</li>
                        <li><strong>Track Items:</strong> How you interact with items affects your race:
                        <ul>
                            <li><strong>Speed Boost:</strong> Bones give your corgi a 2-second speed burst. You cannot collect another bone while boosted.</li>
                            <li><strong>Obstacle:</strong> Flowers make your corgi slow down to sniff around for 2 seconds.</li>
                        </ul>
                        </li>
                        <li>The race starts with a clear countdown and ends when the first corgi crosses the finish line.</li>
                    </ul>
                    <p className="contact-email">If you have any questions, please contact: <a href="mailto:madelinerachow27@gmail.com">madelinerachow27@gmail.com</a></p>
                    </div>
                </div>
        </div>
    );
};

export default HelpPage;