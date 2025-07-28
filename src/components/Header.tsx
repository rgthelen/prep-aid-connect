import { Button } from "@/components/ui/button";
import { Shield, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">ARA</span>
            <span className="text-xs text-muted-foreground -mt-1">PreRescue</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t('header.features')}
          </a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t('header.howItWorks')}
          </a>
        </nav>

        {/* Language Selector & CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector />
          <Link to="/auth">
            <Button variant="outline" size="sm">
              {t('header.signIn')}
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">
              {t('header.createPEPR')}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('header.features')}
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('header.howItWorks')}
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Link to="/auth">
                <Button variant="outline" size="sm" className="w-full">
                  {t('header.signIn')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="w-full">
                  {t('header.createPEPR')}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;