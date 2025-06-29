import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/pexels-scottwebb-1029624.jpg';
import logo from '../assets/1002079229-removebg-preview.png';
import logoDark from '../assets/1002079229-removebg-preview-modified.png';
import { useThemeContext } from '../context/ThemeContext';
import { 
  LightMode as LightModeIcon, 
  DarkMode as DarkModeIcon,
  Visibility as VisibilityIcon,
  BugReport as BugReportIcon,
  SmartToy as SmartToyIcon,
  ArrowForward as ArrowForwardIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const { darkTheme, setDarkTheme } = useThemeContext();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <VisibilityIcon sx={{ fontSize: 40 }} />,
      title: "Interactive Visualization",
      description: "Explore your WAF rules through dynamic, interactive graphs that show relationships and dependencies at a glance.",
      action: () => navigate('/app/visualization'),
      color: '#1976d2'
    },
    {
      icon: <BugReportIcon sx={{ fontSize: 40 }} />,
      title: "Rule Testing & Debugging",
      description: "Test your WAF rules against real requests and see exactly how they behave in different scenarios.",
      action: () => navigate('/app/debugger'),
      color: '#2e7d32'
    },
    {
      icon: <SmartToyIcon sx={{ fontSize: 40 }} />,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations and explanations about your WAF rules from our AI assistant.",
      action: () => navigate('/app/ai'),
      color: '#00897b'
    }
  ];

  const benefits = [
    {
      icon: <SecurityIcon sx={{ fontSize: 32 }} />,
      title: "Enhanced Security",
      description: "Identify gaps and optimize your WAF configuration for better protection."
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 32 }} />,
      title: "Improved Performance",
      description: "Streamline your rules for faster processing and reduced latency."
    },
    {
      icon: <InsightsIcon sx={{ fontSize: 32 }} />,
      title: "Better Understanding",
      description: "Visualize complex rule relationships that are impossible to see in code alone."
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `url(${backgroundImage}) no-repeat center center / cover`,
      position: 'relative',
      fontFamily: "'Poppins', sans-serif"
    }}>
      {/* Dark overlay for dark mode */}
      {darkTheme && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.55)',
          zIndex: 0,
          pointerEvents: 'none',
        }} />
      )}

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '70px',
        background: darkTheme ? 'rgba(34, 34, 34, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${darkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <img
            src={darkTheme ? logoDark : logo}
            alt="Logo"
            style={{
              height: '60px',
              cursor: 'pointer'
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/about')}
              style={{
                background: 'transparent',
                border: 'none',
                color: darkTheme ? '#fff' : '#333',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: darkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }
              }}
            >
              About
            </button>
            <button
              onClick={() => setDarkTheme(!darkTheme)}
              style={{
                background: 'transparent',
                border: 'none',
                color: darkTheme ? '#fff' : '#333',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                '&:hover': {
                  background: darkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }
              }}
              title={darkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkTheme ? <LightModeIcon /> : <DarkModeIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          textAlign: 'center',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s ease-out'
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: darkTheme ? '#fff' : '#333',
            textShadow: darkTheme ? '0 2px 10px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.1)',
            lineHeight: 1.2
          }}>
            Visualize & Optimize Your
            <br />
            <span style={{
              background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AWS WAF Rules
            </span>
          </h1>
          
          <p style={{
            fontSize: '1.25rem',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            lineHeight: 1.6,
            color: darkTheme ? '#e0e0e0' : '#666',
            textShadow: darkTheme ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
          }}>
            Transform complex WAF configurations into clear, actionable insights. 
            Discover relationships, test rules, and optimize your security setup with our powerful visualization tools.
          </p>

          <button
            onClick={() => navigate('/app/visualization')}
            style={{
              background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
              color: '#fff',
              border: 'none',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 35px rgba(25, 118, 210, 0.4)'
              }
            }}
          >
            Start Visualizing
            <ArrowForwardIcon />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '4rem 2rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
            color: darkTheme ? '#fff' : '#333'
          }}>
            Powerful Tools for WAF Management
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={feature.action}
                style={{
                  background: darkTheme ? 'rgba(40,40,40,0.8)' : 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: `1px solid ${darkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                  }
                }}
              >
                <div style={{
                  color: feature.color,
                  marginBottom: '1.5rem'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  color: darkTheme ? '#fff' : '#333'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: darkTheme ? '#ccc' : '#666',
                  marginBottom: '1.5rem'
                }}>
                  {feature.description}
                </p>
                <button
                  style={{
                    background: 'transparent',
                    border: `2px solid ${feature.color}`,
                    color: feature.color,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: feature.color,
                      color: '#fff'
                    }
                  }}
                >
                  Explore
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{
        padding: '4rem 2rem',
        background: darkTheme ? 'rgba(30,30,30,0.8)' : 'rgba(250,250,250,0.8)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
            color: darkTheme ? '#fff' : '#333'
          }}>
            Why Choose Our Tool?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {benefits.map((benefit, index) => (
              <div
                key={index}
                style={{
                  textAlign: 'center',
                  padding: '2rem'
                }}
              >
                <div style={{
                  color: '#1976d2',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {benefit.icon}
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  color: darkTheme ? '#fff' : '#333'
                }}>
                  {benefit.title}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: darkTheme ? '#ccc' : '#666'
                }}>
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: darkTheme ? '#fff' : '#333'
          }}>
            Ready to Transform Your WAF Management?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            marginBottom: '2rem',
            color: darkTheme ? '#ccc' : '#666',
            lineHeight: 1.6
          }}>
            Join security professionals who are already using our tools to optimize their AWS WAF configurations.
          </p>
          <button
            onClick={() => navigate('/app/visualization')}
            style={{
              background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
              color: '#fff',
              border: 'none',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 35px rgba(25, 118, 210, 0.4)'
              }
            }}
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        background: darkTheme ? 'rgba(20,20,20,0.9)' : 'rgba(240,240,240,0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${darkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          color: darkTheme ? '#ccc' : '#666'
        }}>
          <p style={{ margin: 0 }}>
            © 2024 AWS WAF Visualization Tool. Built for security professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;