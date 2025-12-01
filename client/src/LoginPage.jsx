import {useState} from "react";
import {useNavigate} from 'react-router-dom';
import BackgroundCanvas from "./Background";

function LoginPage({supabase}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    function createAccountButton() {
        navigate("/createaccount");
    };

    function forgotPasswordButton() {
        navigate("/forgotpassword");
    };

    const handleLogin = async() => {
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) alert(error.message);
    };

    return (
        <div>
            <BackgroundCanvas/>
            <div className="background-rect">
                <h3>Compete against friends in a corgi dash for the finish line!</h3>
                <div className="buttons login-buttons">
                    <div className="button-row">
                        <div className="input-col">
                            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
                            <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/>
                        </div>
                        <button className="submit-button login-button" onClick={handleLogin}>Login</button>
                    </div>
                    <div className="button-row">
                        <button className="small-button" onClick={createAccountButton}>Create Account</button>
                        <button className="small-button" onClick={forgotPasswordButton}>Forgot Password?</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function CreateAccountPage({supabase}) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    function backToLogin() {
        navigate("/login");
    };

    const handleSignUp = async() => {
        if (!email || !username || !password) {
            alert("All fields required");
            return;
        }
        const corgiSkin = "tri_no_tail";
        const {error} = await supabase.auth.signUp({email, password, options: {data: {username, corgiSkin}}});
        if (error) {
            if (error.message.includes("User already registered")) {
                alert(`${email} is already registered.`);
            } else {
                alert(error.message);
            };
        };
    };

    return (
        <div>
            <button className="corner-button" onClick={backToLogin}>Back to Login</button>
            <div className="background-rect">
                <h3>Create an account!</h3>
                <div className="button-row">
                    <div className="input-col">
                        <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
                        <input className="input-field" type="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/>
                        <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/>
                    </div>
                    <button className="submit-button signup-button" onClick={handleSignUp}>Signup</button>
                </div>
            </div>
        </div>
    );    
};

function ForgotPasswordPage({supabase}) {
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    function backToLogin() {
        navigate("/login");
    };

    const handleForgotPassword = async() => {
        const {error} = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/resetpassword`
        });
        if (error) alert (error.message);
        else alert("If an account with that email exists, you will receive a password reset link.");
    };

    return (
        <div>
            <button className="corner-button" onClick={backToLogin}>Back to Login</button>
            <div className="background-rect">
                <h3>Password recovery!</h3>
                <div className="input-col">
                    <input className="input-field big-input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
                    <button className="big-button" onClick={handleForgotPassword}>Reset password</button>
                </div>
            </div>
        </div>
    );    
};

function ResetPasswordPage({supabase}) {
    const [newPassword, setNewPassword] = useState("");
    const navigate = useNavigate();
    
    const handleResetPassword = async() => {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get("access_token");

        const {error} = await supabase.auth.updateUser({password: newPassword}, {accessToken});
        if (error) alert (error.message);
        else {
            alert("Password updated successfully");
            navigate("/login");
        };
    };

    return (
        <div>
            <div className="background-rect">
            <h3>Reset password</h3>
            <div className="input-col">
                <input className="input-field big-input-field" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                <button className="big-button" onClick={handleResetPassword}>Set new password</button>
            </div>
            </div>
        </div>
    );      

}

export {LoginPage, CreateAccountPage, ForgotPasswordPage, ResetPasswordPage};