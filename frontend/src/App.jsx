import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'

import Home from './pages/Home'
import Create from './pages/Create'
import Dashboard from './pages/Dashboard'
import Navbar from './components/Navbar'

import '@solana/wallet-adapter-react-ui/styles.css'
import './App.css'

function App() {
  const network = 'devnet' // Change to 'mainnet-beta' for production
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <div className="app">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<Create />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </div>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App
