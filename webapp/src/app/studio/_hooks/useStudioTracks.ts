"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MasterIndexEntry, TrackRecord, createShardWorker, fetchTracksFromShard } from "@/lib/sqlWorker";
import type { WorkerHttpvfs } from "sql.js-httpvfs";

export function useStudioTracks() {
  const [masterIndex, setMasterIndex] = useState<MasterIndexEntry[]>([]);
  const [selectedShard, setSelectedShard] = useState<string>("");
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const workerRef = useRef<WorkerHttpvfs | null>(null);
  const shardCacheRef = useRef<Map<string, TrackRecord[]>>(new Map());

  // Fetch Master Index on initial load
  useEffect(() => {
    async function loadIndex() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/db/master_index.json`);
        const data: MasterIndexEntry[] = await res.json();
        setMasterIndex(data);
        if (data.length > 0) {
          setSelectedShard(data[0].shard as string);
        }
      } catch (err) {
        console.error("Failed to load master_index.json", err);
      }
    }
    loadIndex();
  }, []);

  // Mount/Switch Web Worker with Shard Caching
  useEffect(() => {
    if (!selectedShard) return;

    let isMounted = true;

    async function initWorker() {
      setLoading(true);

      // Check Cache first
      if (shardCacheRef.current.has(selectedShard) && searchQuery.trim() === "") {
        setTracks(shardCacheRef.current.get(selectedShard)!);
        setLoading(false);
        return;
      }

      if (workerRef.current) {
        workerRef.current = null;
      }

      try {
        const shardEntry = masterIndex.find((m) => m.shard === selectedShard);
        const fileLength = shardEntry?.size || 4681728;
        const worker = await createShardWorker(selectedShard, fileLength);
        if (!isMounted) return;

        workerRef.current = worker;
        const result = await fetchTracksFromShard(worker, searchQuery);
        if (isMounted) {
          if (searchQuery.trim() === "") {
            shardCacheRef.current.set(selectedShard, result);
          }
          setTracks(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing shard worker", err);
        if (isMounted) {
          setTracks([]);
          setLoading(false);
        }
      }
    }

    initWorker();

    return () => {
      isMounted = false;
    };
  }, [selectedShard, searchQuery, masterIndex]);

  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value);
    if (workerRef.current) {
      setLoading(true);
      try {
        const result = await fetchTracksFromShard(workerRef.current, value);
        setTracks(result);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        setTracks([]);
      } catch (e) {
        console.error("Search fallback error", e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  return {
    masterIndex,
    selectedShard,
    setSelectedShard,
    tracks,
    loading,
    searchQuery,
    handleSearch,
  };
}
