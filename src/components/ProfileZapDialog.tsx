import { useState, useEffect } from 'react';
import { Zap, Copy, Check, ExternalLink, Sparkle, Sparkles, Star, Rocket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useIsMobile';
import QRCode from 'qrcode';

interface ProfileZapDialogProps {
  pubkey: string;
  lud16?: string;
  displayName: string;
  children?: React.ReactNode;
  className?: string;
}

const presetAmounts = [
  { amount: 21, icon: Sparkle },
  { amount: 100, icon: Sparkles },
  { amount: 500, icon: Zap },
  { amount: 1000, icon: Star },
  { amount: 5000, icon: Rocket },
];

/**
 * ProfileZapDialog - A zap dialog for profile pages
 * 
 * Unlike the regular ZapDialog which requires login and creates NIP-57 zap receipts,
 * this component works for anyone and creates a simple LNURL-pay invoice.
 * The payment goes directly to the recipient's Lightning address.
 */
export function ProfileZapDialog({ 
  pubkey: _pubkey, 
  lud16, 
  displayName, 
  children, 
  className 
}: ProfileZapDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Generate QR code when invoice changes
  useEffect(() => {
    let isCancelled = false;

    const generateQR = async () => {
      if (!invoice) {
        setQrCodeUrl('');
        return;
      }

      try {
        const url = await QRCode.toDataURL(invoice.toUpperCase(), {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        if (!isCancelled) {
          setQrCodeUrl(url);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to generate QR code:', err);
        }
      }
    };

    generateQR();

    return () => {
      isCancelled = true;
    };
  }, [invoice]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAmount(100);
      setInvoice(null);
      setCopied(false);
      setQrCodeUrl('');
      setIsLoading(false);
    }
  }, [open]);

  const fetchInvoice = async () => {
    if (!lud16) {
      toast({
        title: 'No Lightning address',
        description: 'This user does not have a Lightning address configured.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Parse Lightning address (user@domain.com format)
      const [username, domain] = lud16.split('@');
      if (!username || !domain) {
        throw new Error('Invalid Lightning address format');
      }

      // Fetch LNURL-pay metadata
      const lnurlResponse = await fetch(`https://${domain}/.well-known/lnurlp/${username}`);
      if (!lnurlResponse.ok) {
        throw new Error('Failed to fetch Lightning address info');
      }

      const lnurlData = await lnurlResponse.json();
      
      // Check amount limits
      const minSendable = Math.ceil((lnurlData.minSendable || 1000) / 1000);
      const maxSendable = Math.floor((lnurlData.maxSendable || 100000000) / 1000);
      
      if (amount < minSendable || amount > maxSendable) {
        throw new Error(`Amount must be between ${minSendable} and ${maxSendable} sats`);
      }

      // Get invoice from callback
      const callback = lnurlData.callback;
      if (!callback) {
        throw new Error('No callback URL in LNURL response');
      }

      const amountMillisats = amount * 1000;
      const invoiceResponse = await fetch(`${callback}?amount=${amountMillisats}`);
      
      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json().catch(() => ({}));
        throw new Error(errorData.reason || 'Failed to create invoice');
      }

      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error('No invoice returned');
      }

      setInvoice(invoiceData.pr);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
      toast({
        title: 'Failed to create invoice',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({
        title: 'Invoice copied',
        description: 'Lightning invoice copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInWallet = () => {
    if (invoice) {
      window.open(`lightning:${invoice}`, '_blank');
    }
  };

  // Don't render if no Lightning address
  if (!lud16) {
    return null;
  }

  const content = (
    <>
      {invoice ? (
        <div className="flex flex-col h-full min-h-0">
          {/* Payment amount display */}
          <div className="text-center pt-4">
            <div className="text-2xl font-bold">{amount} sats</div>
            <div className="text-sm text-muted-foreground">to {displayName}</div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col justify-center min-h-0 flex-1 px-2">
            {/* QR Code */}
            <div className="flex justify-center">
              <Card className="p-3 max-w-[280px] mx-auto">
                <CardContent className="p-0 flex justify-center">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Lightning Invoice QR Code"
                      className="w-full h-auto aspect-square max-w-full object-contain"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-muted animate-pulse rounded" />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Invoice input */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="invoice">Lightning Invoice</Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  id="invoice"
                  value={invoice}
                  readOnly
                  className="font-mono text-xs min-w-0 flex-1 overflow-hidden text-ellipsis"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Payment buttons */}
            <div className="space-y-3 mt-4">
              <Button
                variant="outline"
                onClick={openInWallet}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Lightning Wallet
              </Button>

              <Button
                variant="ghost"
                onClick={() => setInvoice(null)}
                className="w-full"
                size="sm"
              >
                Change amount
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                Scan the QR code or copy the invoice to pay with any Lightning wallet.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 px-4 py-4 w-full overflow-hidden">
            <ToggleGroup
              type="single"
              value={String(amount)}
              onValueChange={(value) => {
                if (value) {
                  setAmount(parseInt(value, 10));
                }
              }}
              className="grid grid-cols-5 gap-1 w-full"
            >
              {presetAmounts.map(({ amount: presetAmount, icon: Icon }) => (
                <ToggleGroupItem
                  key={presetAmount}
                  value={String(presetAmount)}
                  className="flex flex-col h-auto min-w-0 text-xs px-1 py-2"
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="truncate">{presetAmount}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-muted" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-muted" />
            </div>
            <Input
              type="number"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full text-sm"
            />
          </div>
          <div className="px-4 pb-4">
            <Button 
              onClick={fetchInvoice} 
              className="w-full" 
              disabled={isLoading || amount <= 0}
              size="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating invoice...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Zap {amount} sats
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <div className={cn("cursor-pointer", className)}>
            {children}
          </div>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>
              {invoice ? 'Lightning Payment' : `Zap ${displayName}`}
            </DrawerTitle>
            <DrawerDescription>
              {invoice 
                ? 'Pay with Bitcoin Lightning Network' 
                : 'Send sats directly via Lightning'
              }
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={cn("cursor-pointer", className)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {invoice ? 'Lightning Payment' : `Zap ${displayName}`}
          </DialogTitle>
          <DialogDescription>
            {invoice 
              ? 'Pay with Bitcoin Lightning Network' 
              : 'Send sats directly via Lightning'
            }
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
