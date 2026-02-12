try:
    with open('error_mp.log', 'r', encoding='utf-16') as f:
        print(f.read(10000)) # Print first 10000 chars
except Exception as e:
    print(e)
    # try default encoding
    try:
        with open('error_mp.log', 'r') as f:
            print(f.read(10000))
    except Exception as e2:
        print(e2)
