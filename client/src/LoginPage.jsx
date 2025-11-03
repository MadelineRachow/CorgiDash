import {useState} from "react";
import {useNavigate} from 'react-router-dom';

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
            <h3>Compete against friends in a corgi dash for the finish line!</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/>
            <button onClick={handleLogin}>Login</button>
            <button onClick={createAccountButton}>New User? Create Account</button>
            <button onClick={forgotPasswordButton}>Forgot Password?</button>
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
        const {error} = await supabase.auth.signUp({email, password, options: {data: {username}}});
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
            <button onClick={backToLogin}>Back to login</button>
            <h3>Create an account!</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
            <input type="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/>
            <button onClick={handleSignUp}>Signup</button>
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
        else alert("Check your email for the password reset link");
    };

    return (
        <div>
            <button onClick={backToLogin}>Back to login</button>
            <h3>Password recovery!</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
            <button onClick={handleForgotPassword}>Reset password</button>
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
            <h3>Reset password</h3>
            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
            <button onClick={handleResetPassword}>Set new password</button>
        </div>
    );      

}

export {LoginPage, CreateAccountPage, ForgotPasswordPage, ResetPasswordPage};