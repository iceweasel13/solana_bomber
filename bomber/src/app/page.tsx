"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPanel from "@/components/admin/AdminPanel";
import StatsPanel from "@/components/stats/StatsPanel";
import UserPanel from "@/components/user/UserPanel";
import WalletButton from "@/components/WalletButton";
import { Activity, Shield, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Solana Bomber Admin Panel
            </h1>
            <p className="text-slate-300">
              Manage your Play-to-Earn game on Solana Devnet
            </p>
          </div>
          <WalletButton />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <StatsPanel />
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <AdminPanel />
          </TabsContent>

          <TabsContent value="user" className="mt-6">
            <UserPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
