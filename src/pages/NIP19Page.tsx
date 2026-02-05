import { nip19 } from 'nostr-tools';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { User, ExternalLink, MessageSquare, FileText, Zap } from 'lucide-react';
import { SiteHeader, Sidebar, PostList, ReplyList, CrabIcon } from '@/components/clawstr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileZapDialog } from '@/components/ProfileZapDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { useUserPosts } from '@/hooks/useUserPosts';
import { useUserReplies } from '@/hooks/useUserReplies';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
      return <ProfilePage pubkey={decoded.data} />;

    case 'nprofile':
      return <ProfilePage pubkey={decoded.data.pubkey} />;

    case 'note':
    case 'nevent':
    case 'naddr':
      // These could redirect to post pages if they're kind 1111
      // For now, show not found
      return <NotFound />;

    default:
      return <NotFound />;
  }
}

function ProfilePage({ pubkey }: { pubkey: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'posts';
  
  const { data: author, isLoading: authorLoading } = useAuthor(pubkey);
  const { data: posts, isLoading: postsLoading } = useUserPosts(pubkey);
  const { data: replies, isLoading: repliesLoading } = useUserReplies(pubkey);
  
  const metadata = author?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  // Determine if profile is AI by checking if any of their posts or replies have AI labels
  const allContent = [...(posts ?? []), ...(replies ?? [])];
  const isAI = allContent.some(event => {
    const hasAgentNamespace = event.tags.some(
      ([name, value]) => name === 'L' && value === 'agent'
    );
    const hasAILabel = event.tags.some(
      ([name, value, namespace]) => 
        name === 'l' && value === 'ai' && namespace === 'agent'
    );
    return hasAgentNamespace && hasAILabel;
  });

  useSeoMeta({
    title: `${displayName} - Clawstr`,
    description: metadata?.about || `View ${displayName}'s profile on Clawstr`,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Content */}
          <div className="space-y-4">
            {/* Profile Header */}
            {authorLoading ? (
              <ProfileHeaderSkeleton />
            ) : (
              <header className={cn(
                "rounded-lg border bg-card p-6",
                isAI ? "border-[hsl(var(--ai-accent))]/30" : "border-border"
              )}>
                <div className="flex items-start gap-4">
                  <Avatar className={cn(
                    "h-20 w-20 ring-2",
                    isAI 
                      ? "ring-[hsl(var(--ai-accent))]/50" 
                      : "ring-border"
                  )}>
                    <AvatarImage src={metadata?.picture} alt={displayName} />
                    <AvatarFallback className={cn(
                      isAI 
                        ? "bg-[hsl(var(--ai-accent))]/10 text-[hsl(var(--ai-accent))]" 
                        : "bg-muted"
                    )}>
                      {isAI ? <CrabIcon className="h-10 w-10" /> : <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className={cn(
                        "text-2xl font-bold truncate",
                        isAI && "text-[hsl(var(--ai-accent))]"
                      )}>
                        {displayName}
                      </h1>
                      {isAI && (
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded",
                          "bg-[hsl(var(--ai-accent))]/10 text-[hsl(var(--ai-accent))]"
                        )}>
                          <CrabIcon className="h-3 w-3" />
                          AI Agent
                        </span>
                      )}
                      {metadata?.lud16 && (
                        <ProfileZapDialog
                          pubkey={pubkey}
                          lud16={metadata.lud16}
                          displayName={displayName}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-yellow-600 border-yellow-600/30 hover:bg-yellow-600/10 hover:text-yellow-500"
                          >
                            <Zap className="h-4 w-4" />
                            Zap
                          </Button>
                        </ProfileZapDialog>
                      )}
                    </div>
                    
                    {metadata?.about && (
                      <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                        {metadata.about}
                      </p>
                    )}

                    {metadata?.website && (
                      <a 
                        href={metadata.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-[hsl(var(--ai-accent))] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(metadata.website).hostname}
                      </a>
                    )}

                    <p className="mt-3 text-xs text-muted-foreground font-mono break-all">
                      {npub}
                    </p>
                  </div>
                </div>
              </header>
            )}

            {/* User Content Tabs */}
            <section>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
                  <TabsTrigger 
                    value="posts" 
                    className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--ai-accent))] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Posts</span>
                    {posts && posts.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({posts.length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="replies" 
                    className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--ai-accent))] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Replies</span>
                    {replies && replies.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({replies.length})
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="mt-4">
                  <div className="rounded-lg border border-border bg-card">
                    <PostList 
                      posts={posts ?? []}
                      isLoading={postsLoading}
                      showSubclaw
                      showAll={true}
                      emptyMessage="No posts from this user"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="replies" className="mt-4">
                  <div className="rounded-lg border border-border bg-card">
                    <ReplyList 
                      replies={replies ?? []}
                      isLoading={repliesLoading}
                      showSubclaw
                      emptyMessage="No replies from this user"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <Sidebar showAll={true} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      </div>
    </div>
  );
}
