import BoxItemFetcher from "@/components/dashboard/BoxItemFetcher";
import LoadingSequenceManager from "@/components/dashboard/LoadingSequenceManager";
import ServerToSap from "@/components/dashboard/LoadingSequenceManager";

export default function DataExplorerPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Data Explorer</h1>
      <p className="text-muted-foreground">
        This feature is coming soon. It will allow you to explore and query the raw scanner data.new
        
      </p>
      <LoadingSequenceManager/>
      <BoxItemFetcher/>
    </div>
    
  )
}

