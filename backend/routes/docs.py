from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase, verify_token

router = APIRouter()

class DocCreate(BaseModel):
    title: str = "Nuevo Documento"
    content_markdown: str = ""

class DocUpdate(BaseModel):
    title: Optional[str] = None
    content_markdown: Optional[str] = None

@router.get("/")
def get_docs(token: str = Depends(verify_token)):
    try:
        res = supabase.table("workspace_docs").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}")
def get_doc(id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("workspace_docs").select("*").eq("id", id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Doc not found")
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def create_doc(doc: DocCreate, token: str = Depends(verify_token)):
    try:
        res = supabase.table("workspace_docs").insert({
            "title": doc.title,
            "content_markdown": doc.content_markdown
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}")
def update_doc(id: str, doc: DocUpdate, token: str = Depends(verify_token)):
    try:
        updates = {}
        if doc.title is not None:
            updates["title"] = doc.title
        if doc.content_markdown is not None:
            updates["content_markdown"] = doc.content_markdown
            
        res = supabase.table("workspace_docs").update(updates).eq("id", id).execute()
        return res.data[0] if res.data else {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def delete_doc(id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("workspace_docs").delete().eq("id", id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
