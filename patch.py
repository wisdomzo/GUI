import json
import os
import shutil
from datetime import datetime

def organize_playcanvas_assets():

    root_dir = os.getcwd()
    config_file = os.path.join(root_dir, 'config.json')
    
    target_filenames = [
        "chart.umd.js", "tailwind-v3.css", "main.js", "StatisticsUtils_copy.js",
        "app_config_copy.js", "chartjs-adapter-date-fns.bundle.min.js", 
        "chartjs-plugin-zoom.js", "supabase.js"
    ]

    if not os.path.exists(config_file):
        print(f" {root_dir} no config.json")
        return

    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        assets = config.get('assets', {})
        
        datapanel_relative_dir = None
        for aid, ainfo in assets.items():
            if ainfo.get('name') == 'dataPanel.html':
                raw_path = ainfo.get('file', {}).get('url')
                if raw_path:
                    datapanel_relative_dir = os.path.dirname(raw_path)
                    break
        
        if not datapanel_relative_dir:
            print("config.jsonにdataPanel.htmlがあった")
            return

        dataPanelAddress = os.path.join(root_dir, datapanel_relative_dir)
        target_assets_dir = os.path.join(dataPanelAddress, "files", "assets")
        
        if not os.path.exists(target_assets_dir):
            os.makedirs(target_assets_dir)

        readme_entries = []
        copied_count = 0

        for target_name in target_filenames:
            found_in_config = False
            for aid, ainfo in assets.items():
                if ainfo.get('name') == target_name:
                    found_in_config = True
                    file_url = ainfo.get('file', {}).get('url')
                    
                    if file_url:
                        src_file_abs = os.path.join(root_dir, file_url)
                        path_parts = file_url.split('/')
                        if len(path_parts) >= 3:
                            asset_id = path_parts[2]
                            version_num = path_parts[3] if len(path_parts) > 3 else "1"
                            
                            dest_id_dir = os.path.join(target_assets_dir, asset_id)
                            src_id_dir = os.path.join(root_dir, path_parts[0], path_parts[1], asset_id)

                            if os.path.exists(src_id_dir):
                                if os.path.exists(dest_id_dir):
                                    shutil.rmtree(dest_id_dir)
                                shutil.copytree(src_id_dir, dest_id_dir)
                                
                                copied_rel_path = f"{target_assets_dir}/{asset_id}/{version_num}/{target_name}"
                                readme_entries.append({
                                    "name": target_name,
                                    "id": asset_id,
                                    "path": copied_rel_path
                                })
                                print(f"Copy done: {target_name}")
                                copied_count += 1
                            else:
                                print(f"no {src_id_dir}")
                    break
            
            if not found_in_config:
                print(f"config.jsonに{target_name}はない。")

        readme_path = os.path.join(root_dir, "README_Asset_Mapping.txt")
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write("PlayCanvas リソース自動整理リスト\n")
            f.write("=" * 80 + "\n")
            f.write(f"作成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("-" * 80 + "\n")
            f.write(f"{'ファイル名':<35} | {'Asset ID':<12} | {'パス'}\n")
            f.write("-" * 80 + "\n")
            for entry in readme_entries:
                f.write(f"{entry['name']:<35} | {entry['id']:<12} | {entry['path']}\n")
            f.write("-" * 80 + "\n")
            f.write(f"コピー成功 {copied_count} / {len(target_filenames)}。\n")

        print("-" * 50)
        print(f"任務完了！")
        print(f"README が作成された: {readme_path}")
        print(f"リソースは以下にコピーされた: {target_assets_dir}")

    except Exception as e:
        print(f"スクリプト実行中にエラーが発生した: {e}")

if __name__ == "__main__":
    organize_playcanvas_assets()