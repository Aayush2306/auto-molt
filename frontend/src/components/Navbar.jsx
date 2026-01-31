import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

function Navbar() {
  const { connected } = useWallet()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <img src="/logo.png" alt="Auto Clawd" className="logo-img" />
        <span>Auto Clawd</span>
      </Link>

      {/* Desktop Nav */}
      <div className="nav-links desktop-nav">
        <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
        {connected && (
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            My Hosting
          </Link>
        )}
        <Link to="/create" className="nav-cta">Launch App</Link>
        <WalletMultiButton />
      </div>

      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="mobile-nav">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          {connected && (
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              My Hosting
            </Link>
          )}
          <Link to="/create" onClick={() => setMobileMenuOpen(false)}>Launch App</Link>
          <WalletMultiButton />
        </div>
      )}
    </nav>
  )
}

export default Navbar
