# Databricks notebook source
# BridgePoint public property-resolution demo
import requests, json

SUPA = "https://xdfsjztwgsbmabshzsjw.supabase.co"
KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"

def rpc(name, payload):
    r = requests.post(
        f"{SUPA}/rest/v1/rpc/{name}",
        headers={"apikey": KEY, "Content-Type": "application/json", "Accept": "application/json"},
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()

address = "140 Hollister Street, Santa Monica, CA"
search = rpc("bridgepoint_public_search_v5200", {"p_query": address, "p_limit": 4})
display(spark.createDataFrame(search.get("results", [])))
