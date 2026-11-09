import Login from "./pages/Login";

function App() {
  return (
    <Login
      onLoginSuccess={(data) => {
        console.log("Login berhasil:", data.user);
      }}
    />
  );
}

export default App;
