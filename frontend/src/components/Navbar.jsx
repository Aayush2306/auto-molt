import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
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
        <img src="/logo.png" alt="AutoClaw" className="logo-img" />
        <span>AutoClaw</span>
      </Link>

      {/* Desktop Nav */}
      <div className="nav-links desktop-nav">
        <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
        {connected && (
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
        )}
        <Link to="/create" className="nav-cta">Launch</Link>
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
              Dashboard
            </Link>
          )}
          <Link to="/create" onClick={() => setMobileMenuOpen(false)}>Launch</Link>
          <WalletMultiButton />
        </div>
      )}
    </nav>
  )
}

export default Navbar
