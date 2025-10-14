import {useState} from "react";

function LoginPage({supabase}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignUp = async() => {
        const {data, error} = await supabase.auth.signUp({email, password});
        if (error) alert(error.message);
    };

    const handleLogin = async() => {
        const {data, error} = await supabase.auth.signInWithPassword({email, password});
        if (error) alert(error.message);
    };

    return (
        <div>
            <h1>Please sign up or login</h1>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleSignUp}>Signup</button>
        </div>
    );
};

export default LoginPage;